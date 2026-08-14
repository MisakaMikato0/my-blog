<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import { url } from "@/utils/url-utils";
import type { AlbumsIndexDto, AlbumsWheelOption } from "./types";

interface Props {
	/** 静态选项（全部 + 本地相册），由页面构建时注入 */
	options: AlbumsWheelOption[];
	/** 动态相册索引接口（默认 /api/gallery/index），失败时静默降级 */
	indexUrl?: string;
	/** 「查看」按钮文案 */
	viewLabel?: string;
	/** 操作提示文案 */
	hintLabel?: string;
	/** 每行高度(px) */
	rowHeight?: number;
}

let {
	options: staticOptions,
	indexUrl = "/api/gallery/index",
	viewLabel = i18n(I18nKey.albumsView),
	hintLabel = i18n(I18nKey.albumsHint),
	rowHeight = 72,
}: Props = $props();

// 以 props 初始化（Astro 构建期注入，SSR 首屏即渲染轮盘选项；
// 运行时仅追加动态相册，不会覆盖初始值）
let options = $state<AlbumsWheelOption[]>([...staticOptions]);
let selected = $state(0);
let loaded = $state(false);
let dragging = $state(false);
let dragOffset = $state(0);

let dragStartY = 0;
let wheelTimer: ReturnType<typeof setTimeout> | undefined;
// 拖拽超过阈值后抑制随后的 click，避免拖动结束误选中
let suppressClick = false;

/** 动态相册合并：去重后追加到轮盘尾部 */
onMount(async () => {
	try {
		const res = await fetch(indexUrl);
		const data = (await res.json()) as AlbumsIndexDto;
		if (!res.ok || !data?.albums) return;
		const cdnBase = data.cdnBase || "";
		const existing = new Set(options.map((o) => o.id));
		const extras: AlbumsWheelOption[] = [];
		for (const a of data.albums) {
			if (a.dynamic !== true || existing.has(a.id)) continue;
			const photos = a.photos || [];
			const coverPath = a.cover || photos[0]?.path || "";
			extras.push({
				id: a.id,
				name: a.name,
				cover: coverPath ? `${cdnBase}${coverPath}` : undefined,
				count: photos.length,
			});
		}
		if (extras.length > 0) options = [...options, ...extras];
	} catch {
		// 索引加载失败：静默降级为静态相册
	} finally {
		loaded = true;
	}
});

const currentCover = $derived(options[selected]?.cover || "");
const selectedId = $derived(options[selected]?.id || "all");
const viewHref = $derived(
	url(selectedId === "all" ? "/albums/all/" : `/albums/${selectedId}/`),
);

/** 背景跨层：最多保留两层做透明度交叉淡入淡出 */
let coverLayers = $state<{ src: string }[]>([]);
$effect(() => {
	const cover = currentCover;
	if (!cover) return;
	if (coverLayers.some((l) => l.src === cover)) return;
	coverLayers = [...coverLayers.slice(-1), { src: cover }];
});

function clampIndex(value: number): number {
	return Math.max(0, Math.min(options.length - 1, value));
}

function moveBy(delta: number): void {
	selected = clampIndex(selected + delta);
}

function selectIndex(index: number): void {
	selected = clampIndex(index);
}

function onWheel(e: WheelEvent): void {
	if (dragging) return;
	e.preventDefault();
	if (wheelTimer) clearTimeout(wheelTimer);
	moveBy(e.deltaY > 0 ? 1 : -1);
	wheelTimer = setTimeout(() => {
		wheelTimer = undefined;
	}, 160);
}

function onPointerDown(e: PointerEvent): void {
	dragging = true;
	dragStartY = e.clientY;
	dragOffset = 0;
	suppressClick = false;
	// 在 window 上跟踪 move/up：不用 setPointerCapture，
	// 以免指针捕获把后续 click 重定向到容器导致选项按钮收不到点击
	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(e: PointerEvent): void {
	if (!dragging) return;
	dragOffset = e.clientY - dragStartY;
}

function onPointerUp(): void {
	if (!dragging) return;
	dragging = false;
	window.removeEventListener("pointermove", onPointerMove);
	window.removeEventListener("pointerup", onPointerUp);
	const delta = Math.round(dragOffset / rowHeight);
	if (Math.abs(dragOffset) > 6) suppressClick = true;
	if (delta !== 0) {
		moveBy(-delta);
		suppressClick = true;
	}
	dragOffset = 0;
}

function onOptionClick(index: number): void {
	if (suppressClick) {
		suppressClick = false;
		return;
	}
	selectIndex(index);
}

function onKeydown(e: KeyboardEvent): void {
	if (e.key === "ArrowUp") {
		e.preventDefault();
		moveBy(-1);
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		moveBy(1);
	}
}
</script>

<div class="albums-wheel-stage">
	<!-- 封面背景（交叉淡入） -->
	<div class="albums-bg" aria-hidden="true">
		{#each coverLayers as layer (layer.src)}
			<img
				src={layer.src}
				alt=""
				class="albums-bg-img"
				class:albums-bg-active={layer.src === currentCover}
				draggable="false"
			/>
		{/each}
		<div class="albums-bg-overlay"></div>
	</div>

	<!-- 选中相册信息 -->
	<div class="albums-wheel-info">
		<h2 class="albums-wheel-title" data-album-selected-name>
			{options[selected]?.name || ""}
		</h2>
		{#if options[selected]?.count != null}
			<p class="albums-wheel-count">
				{options[selected].count} {i18n(I18nKey.galleryPhotos)}
			</p>
		{/if}
		<a
			class="albums-view-btn"
			href={viewHref}
			data-album-view
		>
			{viewLabel}
		</a>
	</div>

	<!-- 滚轮 -->
	<div
		class="albums-wheel"
		role="listbox"
		aria-label={hintLabel}
		tabindex="0"
		style="--albums-row-height: {rowHeight}px"
		onwheel={onWheel}
		onpointerdown={onPointerDown}
		onpointercancel={onPointerUp}
		onkeydown={onKeydown}
	>
		{#each options as option, i (option.id)}
			{@const offset = i - selected}
			{@const distance = Math.min(Math.abs(offset), 3)}
			<button
				type="button"
				role="option"
				aria-selected={i === selected}
				data-album-option
				data-album-option-id={option.id}
				class="albums-wheel-item"
				class:albums-wheel-item-active={i === selected}
				style="
					--ow-y: {offset * rowHeight}px;
					--ow-drag: {dragging ? dragOffset : 0}px;
					--ow-scale: {1 - distance * 0.13};
					--ow-opacity: {offset === 0 ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.28 : 0.1};
					--ow-z: {100 - distance};
					transition: {dragging ? "none" : "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.38s ease"};
				"
				onclick={() => onOptionClick(i)}
			>
				<span class="albums-wheel-item-text">{option.name}</span>
			</button>
		{/each}
	</div>

	<p class="albums-wheel-hint" data-album-hint>{hintLabel}</p>
</div>
