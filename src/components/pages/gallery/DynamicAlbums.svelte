<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import { url } from "@/utils/url-utils";
import type { GalleryIndexDto } from "./types";

interface DynamicAlbum {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags: string[];
	photoCount: number;
	coverUrl: string;
}

let dynamicAlbums = $state<DynamicAlbum[]>([]);

onMount(async () => {
	try {
		const res = await fetch("/api/gallery/index");
		const data = (await res.json()) as GalleryIndexDto;
		if (!res.ok || !data?.albums) return;
		const cdnBase: string = data.cdnBase || "";
		const list: DynamicAlbum[] = (data.albums || [])
			.filter((a) => a.dynamic === true)
			.map((a) => {
				const photos = a.photos || [];
				const coverPath: string = a.cover || photos[0]?.path || "";
				return {
					id: a.id,
					name: a.name,
					description: a.description,
					date: a.date,
					location: a.location,
					tags: a.tags || [],
					photoCount: photos.length,
					coverUrl: coverPath ? `${cdnBase}${coverPath}` : "",
				};
			});
		dynamicAlbums = list;

		// 追加动态相册的标签到筛选器
		const filterEl = document.querySelector<HTMLElement>(
			"[data-gallery-filter]",
		);
		if (filterEl) {
			const existing = new Set(
				Array.from(filterEl.querySelectorAll<HTMLElement>("[data-tag]")).map(
					(b) => b.dataset.tag || "",
				),
			);
			for (const tag of list.flatMap((a) => a.tags)) {
				if (!tag || existing.has(tag)) continue;
				existing.add(tag);
				const btn = document.createElement("button");
				btn.dataset.tag = tag;
				btn.className = "tools-tab-btn tools-tab-btn-inactive";
				btn.textContent = tag;
				filterEl.appendChild(btn);
			}
		}

		// 空态控制：静态相册与动态相册都为空时才显示
		const grid = document.querySelector<HTMLElement>("[data-album-grid]");
		const empty = document.querySelector<HTMLElement>("[data-album-empty]");
		if (grid && empty) {
			const staticCount = Number(grid.dataset.staticCount || 0);
			empty.style.display =
				staticCount === 0 && list.length === 0 ? "flex" : "none";
		}
	} catch {
		// 加载失败静默处理，不影响静态相册展示
	}
});
</script>

{#each dynamicAlbums as album (album.id)}
	<a
		href={url(`/gallery/${album.id}/`)}
		data-tags={(album.tags || []).join(",") || ""}
		class="album-card group"
	>
		<div class="album-card-imgbox">
			{#if album.coverUrl}
				<img
					src={album.coverUrl}
					alt={album.name}
					class="album-card-img"
					loading="lazy"
					decoding="async"
					width="400"
					height="300"
				/>
			{:else}
				<div class="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
					<div class="text-gray-400 text-5xl">📷</div>
				</div>
			{/if}

			<div class="album-card-badge">
				{album.photoCount} {i18n(I18nKey.galleryPhotos)}
			</div>

			{#if album.tags.length > 0}
				<div class="album-card-tags-overlay">
					{#each album.tags.slice(0, 4) as tag (tag)}
						<span class="album-card-tag-overlay">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="album-card-details">
			<h3 class="album-card-title">{album.name}</h3>
			<div class="album-card-meta">
				{#if album.date}
					<span>{album.date}</span>
				{/if}
				{#if album.location}
					<span class="album-card-location">
						<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
						</svg>
						{album.location}
					</span>
				{/if}
			</div>
		</div>
	</a>
{/each}
