<script lang="ts">
import { onMount } from "svelte";
import PhotoCard from "./PhotoCard.svelte";
import type { GalleryIndexDto } from "./types";

interface Props {
	albumId: string;
}

let { albumId }: Props = $props();

let photos = $state<Array<{ path: string; url: string }>>([]);

onMount(async () => {
	try {
		const res = await fetch("/api/gallery/index");
		const data = (await res.json()) as GalleryIndexDto;
		if (!res.ok || !data?.albums) return;
		const cdnBase: string = data.cdnBase || "";
		const found = data.albums.find((a) => a.id === albumId);
		if (!found) return;
		photos = (found.photos || []).map((p) => ({
			path: p.path,
			url: `${cdnBase}${p.path}`,
		}));
	} catch {
		// 加载失败静默处理
	}
});
</script>

{#each photos as photo (photo.path)}
	<PhotoCard src={photo.url} albumId={albumId} alt={photo.path} />
{/each}
