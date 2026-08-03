<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@/components/common/Icon.svelte";

interface Props {
	disabled?: boolean;
	uploading?: boolean;
	onFiles: (files: File[]) => void;
}

let { disabled = false, uploading = false, onFiles }: Props = $props();

let input: HTMLInputElement | undefined = $state();
let dragOver = $state(false);

function acceptFiles(files: FileList | File[] | null) {
	if (!files || disabled || uploading) return;
	const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
	if (list.length > 0) onFiles(list);
}

function handleDrop(e: DragEvent) {
	e.preventDefault();
	dragOver = false;
	acceptFiles(e.dataTransfer?.files || null);
}

function handleChange() {
	acceptFiles(input?.files || null);
	if (input) input.value = "";
}
</script>

<div
	class={[
		"admin-uploadzone",
		{ "admin-uploadzone--dragover": dragOver },
		{ "admin-uploadzone--disabled": disabled || uploading },
	]}
	role="button"
	tabindex={disabled || uploading ? -1 : 0}
	onclick={() => input?.click()}
	onkeydown={(e) => {
		if (e.key === "Enter" || e.key === " ") input?.click();
	}}
	ondragover={(e) => {
		e.preventDefault();
		dragOver = true;
	}}
	ondragleave={() => {
		dragOver = false;
	}}
	ondrop={handleDrop}
>
	{#if dragOver}
		<Icon name="material-symbols:add-photo-alternate-rounded" class="admin-uploadzone__icon" />
		<p class="admin-uploadzone__title">{i18n(I18nKey.galleryAdminDropHere)}</p>
	{:else if uploading}
		<Icon name="svg-spinners:ring-resize" class="admin-uploadzone__icon" />
		<p class="admin-uploadzone__title">{i18n(I18nKey.galleryAdminUploading)}</p>
	{:else}
		<Icon name="material-symbols:add-photo-alternate-rounded" class="admin-uploadzone__icon" />
		<p class="admin-uploadzone__title">{i18n(I18nKey.galleryAdminUpload)}</p>
		<p class="admin-uploadzone__hint">{i18n(I18nKey.galleryAdminUploadHint)}</p>
	{/if}
	<input
		bind:this={input}
		type="file"
		accept="image/jpeg,image/png,image/webp,image/gif"
		multiple
		class="hidden"
		onchange={handleChange}
	/>
</div>
