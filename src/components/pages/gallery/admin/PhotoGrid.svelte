<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@/components/common/Icon.svelte";
import type { AdminPhoto } from "./types";

interface Props {
	albumId: string;
	photos: AdminPhoto[];
	coverPath?: string;
	onDelete?: (photo: AdminPhoto) => void;
	onCopy?: (photo: AdminPhoto) => void;
	onSetCover?: (photo: AdminPhoto) => void;
}

let { albumId, photos, coverPath, onDelete, onCopy, onSetCover }: Props =
	$props();
</script>

{#if photos.length === 0}
	<div class="photo-empty">
		<Icon name="material-symbols:photo-library" />
		<p>{i18n(I18nKey.galleryAdminEmpty)}</p>
	</div>
{:else}
	<div class="photo-grid">
		{#each photos as photo (photo.path)}
			<div class="photo-item">
				<div
					data-fancybox={`admin-gallery-${albumId}`}
					data-src={photo.url}
					data-type="image"
					class="photo-item__thumb"
				>
					<img src={photo.url} alt={photo.path} loading="lazy" decoding="async" />
					{#if coverPath === photo.path}
						<span class="photo-item__cover-badge">{i18n(I18nKey.galleryAdminSetCover)}</span>
					{/if}
				</div>
				<div class="photo-item__actions">
					<button title={i18n(I18nKey.galleryAdminCopyLink)} onclick={() => onCopy?.(photo)}>
						<Icon name="material-symbols:link-rounded" />
					</button>
					<button title={i18n(I18nKey.galleryAdminSetCover)} onclick={() => onSetCover?.(photo)}>
						<Icon name="material-symbols:bookmark-rounded" />
					</button>
					<button class="danger" title={i18n(I18nKey.galleryAdminDelete)} onclick={() => onDelete?.(photo)}>
						<Icon name="material-symbols:delete-rounded" />
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
