<script lang="ts">
import Icon from "@/components/common/Icon.svelte";

interface Props {
	title: string;
	message: string;
	confirmText: string;
	cancelText: string;
	danger?: boolean;
	busy?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

let {
	title,
	message,
	confirmText,
	cancelText,
	danger = false,
	busy = false,
	onConfirm,
	onCancel,
}: Props = $props();
</script>

<div class="dialog-overlay" onclick={() => { if (!busy) onCancel(); }}>
	<div
		class="dialog"
		role="dialog"
		aria-modal="true"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			if (e.key === "Escape" && !busy) onCancel();
		}}
	>
		<h3>{title}</h3>
		<p>{message}</p>
		<div class="dialog__actions">
			<button class="admin-btn" onclick={onCancel} disabled={busy}>{cancelText}</button>
			<button
				class={["admin-btn", danger ? "admin-btn--danger" : "admin-btn--primary"]}
				onclick={onConfirm}
				disabled={busy}
			>
				{#if busy}
					<Icon name="svg-spinners:ring-resize" size="sm" />
				{/if}
				{confirmText}
			</button>
		</div>
	</div>
</div>
