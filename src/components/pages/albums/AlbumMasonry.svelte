<script lang="ts">
import { onMount } from "svelte";
import PhotoCard from "../gallery/PhotoCard.svelte";
import type { AlbumPhotoItem, AlbumsIndexDto } from "./types";

interface Props {
	/** 静态照片（本地相册，构建时注入） */
	photos: AlbumPhotoItem[];
	/** 相册 id；不传表示「全部」视图 */
	albumId?: string;
	/** 每次加载数量，默认 48 */
	pageSize?: number;
	/** 瀑布流最小列宽(px)，默认 240 */
	columnWidth?: number;
	/** 动态相册索引接口，默认 /api/gallery/index */
	indexUrl?: string;
	/** 加载中文案 */
	loadingLabel?: string;
	/** 空态文案 */
	emptyLabel?: string;
	/** 灯箱分组名，默认 albums-{albumId|all} */
	fancyboxGroup?: string;
}

let {
	photos: staticPhotos,
	albumId,
	pageSize = 48,
	columnWidth = 240,
	indexUrl = "/api/gallery/index",
	loadingLabel = "",
	emptyLabel = "",
	fancyboxGroup = `albums-${albumId || "all"}`,
}: Props = $props();

// 以 props 初始化静态照片（SSR 首屏即渲染瀑布流内容）
let allPhotos = $state<AlbumPhotoItem[]>([...staticPhotos]);
let visibleCount = $state(
	Math.min(pageSize, allPhotos.length > 0 ? allPhotos.length : pageSize),
);
let loaded = $state(false);
let sentinel: HTMLDivElement | undefined = $state();
let observer: IntersectionObserver | undefined;

const displayed = $derived(allPhotos.slice(0, visibleCount));
const hasMore = $derived(visibleCount < allPhotos.length);

$effect(() => {
	if (!sentinel) return;
	if (typeof IntersectionObserver === "undefined") return;
	observer?.disconnect();
	observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting && hasMore) {
				visibleCount = Math.min(allPhotos.length, visibleCount + pageSize);
			}
		},
		{ rootMargin: "600px" },
	);
	observer.observe(sentinel);
	return () => observer?.disconnect();
});

/** 合并动态相册照片：单相册视图取该相册全部索引照片；全部视图仅取 dynamic 相册 */
onMount(async () => {
	try {
		const res = await fetch(indexUrl);
		const data = (await res.json()) as AlbumsIndexDto;
		if (!res.ok || !data?.albums) return;
		const cdnBase = data.cdnBase || "";
		const existing = new Set(allPhotos.map((p) => p.src));
		const merged: AlbumPhotoItem[] = [];
		for (const a of data.albums) {
			if (albumId) {
				if (a.id !== albumId) continue;
			} else if (a.dynamic !== true) {
				continue;
			}
			for (const p of a.photos || []) {
				const src = `${cdnBase}${p.path}`;
				if (existing.has(src)) continue;
				existing.add(src);
				merged.push({
					src,
					albumId: a.id,
					caption: a.name,
				});
			}
		}
		if (merged.length > 0) {
			allPhotos = [...allPhotos, ...merged];
			// 合并后顺带加载一批，避免哨兵在首屏外导致新照片迟迟不出现
			visibleCount = Math.min(allPhotos.length, visibleCount + pageSize);
		}
	} catch {
		// 索引加载失败：静默降级为静态照片
	} finally {
		loaded = true;
	}
});
</script>

<div
	class="albums-masonry"
	style="--col-width: {columnWidth}px"
	data-albums-masonry
>
	{#each displayed as photo (photo.src + photo.albumId)}
		<PhotoCard
			src={photo.src}
			thumbSrc={photo.thumb}
			albumId={photo.albumId}
			caption={photo.caption}
			fancyboxGroup={fancyboxGroup}
		/>
	{/each}
</div>

<div
	bind:this={sentinel}
	class="albums-sentinel"
	aria-hidden="true"
	data-albums-sentinel
></div>

{#if allPhotos.length === 0}
	<p class="albums-state" data-albums-state>
		{loaded ? emptyLabel : loadingLabel}
	</p>
{/if}
