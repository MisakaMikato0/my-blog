<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import AlbumMasonry from "./AlbumMasonry.svelte";

let albumId = $state("");

onMount(() => {
	// worker 将 /albums/{id}/（静态构建不存在）兜底渲染本壳，URL 保持不变
	const m = window.location.pathname.match(/^\/albums\/([^/]+)\/$/);
	albumId = m ? m[1] : "";
});
</script>

{#if albumId}
	<AlbumMasonry
		albumId={albumId}
		loadingLabel={i18n(I18nKey.albumsLoading)}
		emptyLabel={i18n(I18nKey.albumsEmpty)}
	/>
{/if}
