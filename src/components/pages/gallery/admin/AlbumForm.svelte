<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { AlbumDraft } from "./types";

interface Props {
	/** 编辑模式：传入相册现有数据时预填表单并隐藏 ID 输入 */
	initial?: AlbumDraft | null;
	onSubmit: (data: AlbumDraft) => Promise<void>;
	onCancel: () => void;
}

let { initial = null, onSubmit, onCancel }: Props = $props();

const editing = $derived(!!initial);

let name = $state(initial?.name ?? "");
let id = $state(initial?.id ?? "");
let description = $state(initial?.description ?? "");
let date = $state(initial?.date ?? "");
let location = $state(initial?.location ?? "");
let tags = $state((initial?.tags ?? []).join(", "));
let busy = $state(false);
let error = $state("");

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
}

async function submit() {
	if (!name.trim() || busy) return;
	busy = true;
	error = "";
	try {
		await onSubmit({
			id: (initial?.id ?? id.trim()) || slugify(name) || `album-${Date.now()}`,
			name: name.trim(),
			description: description.trim() || undefined,
			date: date.trim() || undefined,
			location: location.trim() || undefined,
			tags: tags
				.split(/[,，]/)
				.map((t) => t.trim())
				.filter(Boolean),
		});
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	} finally {
		busy = false;
	}
}
</script>

<form class="album-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
	<div class="album-form__row">
		<label>
			{i18n(I18nKey.galleryAdminAlbumName)} *
			<input type="text" bind:value={name} placeholder={i18n(I18nKey.galleryAdminAlbumName)} />
		</label>
		<label>
			{i18n(I18nKey.galleryAdminAlbumDate)}
			<input type="date" bind:value={date} />
		</label>
	</div>
	{#if !editing}
		<label>
			ID (URL)
			<input
				type="text"
				bind:value={id}
				placeholder="auto: {slugify(name) || 'album-id'}"
				pattern="[a-z0-9][a-z0-9-]{0,46}[a-z0-9]"
			/>
		</label>
	{/if}
	<label>
		{i18n(I18nKey.galleryAdminAlbumDescription)}
		<textarea rows="2" bind:value={description}></textarea>
	</label>
	<div class="album-form__row">
		<label>
			{i18n(I18nKey.galleryAdminAlbumLocation)}
			<input type="text" bind:value={location} />
		</label>
		<label>
			{i18n(I18nKey.galleryAdminAlbumTags)}
			<input type="text" bind:value={tags} placeholder="tag1, tag2" />
		</label>
	</div>
	{#if error}
		<p class="album-form__error">{error}</p>
	{/if}
	<div class="album-form__actions">
		<button type="button" class="admin-btn" onclick={onCancel}>{i18n(I18nKey.galleryAdminCancel)}</button>
		<button type="submit" class="admin-btn admin-btn--primary" disabled={busy || !name.trim()}>
			{editing ? i18n(I18nKey.galleryAdminSave) : i18n(I18nKey.galleryAdminCreate)}
		</button>
	</div>
</form>
