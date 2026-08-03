<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@/components/common/Icon.svelte";

interface Props {
	onVerify: (password: string) => Promise<boolean>;
}

let { onVerify }: Props = $props();

let password = $state("");
let busy = $state(false);
let error = $state(false);

async function submit() {
	if (!password || busy) return;
	busy = true;
	error = false;
	const ok = await onVerify(password);
	if (!ok) error = true;
	busy = false;
}
</script>

<div class="admin-login card-base">
	<Icon name="material-symbols:photo-library" class="admin-login__icon" />
	<h2>{i18n(I18nKey.galleryAdmin)}</h2>
	<p>{i18n(I18nKey.galleryAdminPassword)}</p>
	<input
		type="password"
		bind:value={password}
		placeholder={i18n(I18nKey.galleryAdminPassword)}
		onkeydown={(e) => {
			if (e.key === "Enter") submit();
		}}
		autocomplete="current-password"
	/>
	<button class="admin-btn admin-btn--primary" onclick={submit} disabled={busy}>
		{#if busy}
			<Icon name="svg-spinners:ring-resize" size="sm" />
		{/if}
		{busy ? i18n(I18nKey.galleryAdminLoading) : i18n(I18nKey.galleryAdminLogin)}
	</button>
	{#if error}
		<p class="admin-login__error">{i18n(I18nKey.galleryAdminLoginError)}</p>
	{/if}
</div>
