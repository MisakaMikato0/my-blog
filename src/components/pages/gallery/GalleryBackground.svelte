<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";

interface Props {
	/** 优先使用的图片（当前相册封面等本地图） */
	preferredSrc?: string;
	/** 文章封面随机图接口 URL 列表（构建时生成，带 seed） */
	apiUrls?: string[];
	/** 全部加载失败时的本地兜底图 */
	fallback?: string;
}

let {
	preferredSrc = "",
	apiUrls = [],
	fallback = "/assets/images/aut.webp",
}: Props = $props();

let loading = false;

const candidates = [preferredSrc, ...apiUrls, fallback].filter(Boolean);

/**
 * 按顺序尝试加载图片，全部失败时使用 fallback 兜底
 */
function loadFrom(list: string[], start: number): void {
	if (start >= list.length) {
		const img = document.querySelector<HTMLImageElement>(
			".gallery-bg-host .gallery-bg-img",
		);
		if (img) img.src = fallback;
		loading = false;
		return;
	}
	const src = list[start];
	const probe = new Image();
	probe.onload = () => {
		const img = document.querySelector<HTMLImageElement>(
			".gallery-bg-host .gallery-bg-img",
		);
		if (img) img.src = src;
		loading = false;
	};
	probe.onerror = () => loadFrom(list, start + 1);
	probe.src = src;
}

/**
 * 换一张背景：重新请求接口（加时间戳参数确保拿到新图）
 */
function changeBackground(): void {
	if (loading || apiUrls.length === 0) return;
	loading = true;
	const t = Date.now();
	const fresh = apiUrls.map((u) => `${u}${u.includes("?") ? "&" : "?"}t=${t}`);
	loadFrom(fresh, 0);
}

onMount(() => {
	const host = document.createElement("div");
	host.className = "gallery-bg-host";
	host.setAttribute("aria-hidden", "true");
	const cleanup: Array<() => void> = [];

	const img = document.createElement("img");
	img.className = "gallery-bg-img";
	img.alt = "";
	img.decoding = "async";
	img.onload = () => img.classList.add("gallery-bg-loaded");
	cleanup.push(() => (img.onload = null));

	const overlay = document.createElement("div");
	overlay.className = "gallery-bg-overlay";

	host.append(img, overlay);

	// 仅在配置了随机图接口时显示"换一张"按钮
	let btn: HTMLButtonElement | null = null;
	if (apiUrls.length > 0) {
		btn = document.createElement("button");
		btn.type = "button";
		btn.className = "gallery-bg-switch";
		btn.title = i18n(I18nKey.galleryBackgroundChange);
		btn.setAttribute("aria-label", i18n(I18nKey.galleryBackgroundChange));
		btn.innerHTML =
			'<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-4.9L21 10"/><path d="M21 4v6h-6"/><path d="M20 12a8 8 0 0 1-14 4.9L3 14"/><path d="M3 20v-6h6"/></svg>';
		btn.addEventListener("click", changeBackground);
		cleanup.push(() => btn?.remove());
	}

	document.body.appendChild(host);
	// 按钮独立挂到 body（避免被 z-index: -1 的背景层 stacking context 困住）
	if (btn) document.body.appendChild(btn);
	loadFrom(candidates, 0);

	return () => {
		host.remove();
		cleanup.forEach((fn) => {
			fn();
		});
	};
});
</script>

<!-- 背景层在客户端挂载时注入 document.body，SSR 无输出 -->
