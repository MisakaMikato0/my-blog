<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { url } from "@/utils/url-utils";
import PhotoCard from "./PhotoCard.svelte";
import type { GalleryIndexDto } from "./types";

type Photo = { path: string; url: string };

interface Album {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	cover?: string;
	photos: Photo[];
}

let album = $state<Album | null>(null);
let error = $state(false);

onMount(async () => {
	const segments = window.location.pathname.split("/").filter(Boolean);
	const id =
		segments.length >= 2
			? decodeURIComponent(segments[segments.length - 1])
			: "";
	if (!id || id === "dynamic-album") {
		window.location.replace(url("/gallery/"));
		return;
	}
	try {
		const res = await fetch("/api/gallery/index");
		const data = (await res.json()) as GalleryIndexDto;
		if (!res.ok || !data?.albums) throw new Error("bad response");
		const cdnBase: string = data.cdnBase || "";
		const found = data.albums.find((a) => a.id === id);
		if (!found) {
			error = true;
			return;
		}
		album = {
			id: found.id,
			name: found.name,
			description: found.description,
			date: found.date,
			location: found.location,
			tags: found.tags,
			cover: found.cover,
			photos: (found.photos || []).map((p) => ({
				path: p.path,
				url: `${cdnBase}${p.path}`,
			})),
		};
	} catch {
		error = true;
	}
});

const coverUrl = $derived(
	album
		? album.cover
			? album.photos.find((p) => p.path === album.cover)?.url ||
				album.photos[0]?.url ||
				""
			: album.photos[0]?.url || ""
		: "",
);
</script>

<div class="dynamic-viewer">
	{#if error}
		<div class="dynamic-viewer__notfound">
			<Icon name="material-symbols:photo-library" />
			<p>{i18n(I18nKey.galleryAlbumNotFound)}</p>
			<a class="admin-btn" href={url("/gallery/")}>{i18n(I18nKey.galleryAdminBackToGallery)}</a>
		</div>
	{:else if !album}
		<div class="admin-loading">
			<Icon name="svg-spinners:ring-resize" size="sm" />
			<span>{i18n(I18nKey.galleryAdminLoading)}</span>
		</div>
	{:else}
		<div class="w-full rounded-(--radius-large) overflow-hidden relative">
			{#if coverUrl}
				<div class="relative w-full aspect-[3/1] min-h-[200px] max-h-[360px]">
					<img src={coverUrl} alt={album.name} class="w-full h-full object-cover" />
					<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
					<a
						href={url("/gallery/")}
						class="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-colors"
					>
						<Icon name="material-symbols:arrow-back" class="text-base" />
						{i18n(I18nKey.galleryBackToAlbums)}
					</a>
					<div class="absolute bottom-0 left-0 right-0 p-6">
						<div class="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
							{album.name}
						</div>
						{#if album.description}
							<p class="text-sm text-white/75 leading-relaxed mb-2 max-w-2xl line-clamp-2">
								{album.description}
							</p>
						{/if}
						<div class="flex items-center gap-4 text-sm text-white/80 flex-wrap">
							{#if album.date}
								<span class="inline-flex items-center gap-1">
									<Icon name="material-symbols:calendar-today" class="text-sm" />
									{album.date}
								</span>
							{/if}
							{#if album.location}
								<span class="inline-flex items-center gap-1">
									<Icon name="material-symbols:location-on" class="text-sm" />
									{album.location}
								</span>
							{/if}
							<span class="inline-flex items-center gap-1">
								<Icon name="material-symbols:photo-library" class="text-sm" />
								{album.photos.length} {i18n(I18nKey.galleryPhotos)}
							</span>
						</div>
						{#if album.tags && album.tags.length > 0}
							<div class="flex flex-wrap gap-1.5 mt-2.5">
								{#each album.tags as tag (tag)}
									<span class="text-xs px-2 py-0.5 rounded bg-white/20 text-white/90 backdrop-blur-sm">
										{tag}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="card-base px-6 py-4">
					<a
						href={url("/gallery/")}
						class="inline-flex items-center gap-1 text-sm text-(--primary) hover:underline mb-3"
					>
						<Icon name="material-symbols:arrow-back" class="text-base" />
						{i18n(I18nKey.galleryBackToAlbums)}
					</a>
					<div class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
						{album.name}
					</div>
				</div>
			{/if}
		</div>

		<div class="w-full rounded-(--radius-large) overflow-hidden relative mt-4">
			<div class="card-base z-10 px-6 py-6 relative w-full">
				{#if album.photos.length > 0}
					<div class="gallery-masonry" style="column-count: 2; column-gap: 0.75rem;">
						{#each album.photos as photo (photo.path)}
							<PhotoCard src={photo.url} albumId={album.id} alt={photo.path} />
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
						<Icon name="material-symbols:photo-library" class="text-6xl mb-4 opacity-50" />
						<p class="text-lg">{i18n(I18nKey.galleryNoAlbums)}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
