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
	photos: string[]; // 前3张照片URL
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
				// 取前3张照片URL
				const photoUrls = photos.slice(0, 3).map((p) => `${cdnBase}${p.path}`);
				return {
					id: a.id,
					name: a.name,
					description: a.description,
					date: a.date,
					location: a.location,
					tags: a.tags || [],
					photoCount: photos.length,
					coverUrl: coverPath ? `${cdnBase}${coverPath}` : "",
					photos: photoUrls,
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

		// 空态控制
		const grid = document.querySelector<HTMLElement>("[data-album-grid]");
		const empty = document.querySelector<HTMLElement>("[data-album-empty]");
		if (grid && empty) {
			const staticCount = Number(grid.dataset.staticCount || 0);
			empty.style.display =
				staticCount === 0 && list.length === 0 ? "flex" : "none";
		}
	} catch {
		// 加载失败静默处理
	}
});
</script>

{#each dynamicAlbums as album (album.id)}
	<a
		href={url(`/gallery/${album.id}/`)}
		data-tags={(album.tags || []).join(",") || ""}
		class="album-card group"
	>
		<div class="polaroid-stack">
			{#each (album.photos.length >= 3 ? album.photos : (() => { const p = [...album.photos]; while (p.length < 3) { p.push(album.coverUrl || ""); } return p; })()) as photo, i}
				<div
					class="polaroid-photo"
					style="--polaroid-rotate: {[-3, 5, -2][i]}deg; --polaroid-offset: {[0, 4, 8][i]}px; z-index: {3 - i};"
				>
					{#if photo}
						<img
							src={photo}
							alt={album.name}
							class="polaroid-img"
							loading="lazy"
							decoding="async"
							width="400"
							height="300"
						/>
					{:else}
						<div class="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
							<span class="text-gray-400 text-3xl">📷</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="album-card-badge">
			{album.photoCount} {i18n(I18nKey.galleryPhotos)}
		</div>

		<div class="polaroid-details">
			<h3 class="polaroid-title">{album.name}</h3>
			<div class="polaroid-meta">
				{#if album.date}
					<span>{album.date}</span>
				{/if}
				{#if album.location}
					<span class="polaroid-location">
						<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
						</svg>
						{album.location}
					</span>
				{/if}
			</div>
			{#if album.tags.length > 0}
				<div class="polaroid-tags">
					{#each album.tags.slice(0, 4) as tag (tag)}
						<span class="polaroid-tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
	</a>
{/each}
