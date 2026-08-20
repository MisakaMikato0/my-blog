<script lang="ts">
import type { LotteryResult } from "@/utils/divination";
import { createLotteryReading } from "@/utils/divination";

type Mode = "random" | "number";

let mode = $state<Mode>("random");
let customTime = $state("");
let numberInput = $state("1");
let result = $state<LotteryResult | null>(null);
let error = $state("");

function cast() {
	error = "";
	const customDate = customTime ? new Date(customTime) : undefined;
	if (mode === "number") {
		const num = Number.parseInt(numberInput, 10);
		if (!Number.isFinite(num) || num < 1 || num > 92) {
			error = "请输入 1-92 之间的签号";
			return;
		}
		result = createLotteryReading({ customDate, number: num });
	} else {
		result = createLotteryReading({ customDate });
	}
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}
</script>

<div class="panel">
	<div class="panel__form">
		<div class="field">
			<label class="field__label" for="lottery-mode">求签方式</label>
			<div class="field__seg">
				<button
					type="button"
					class:field__seg-item={true}
					class:field__seg-item--active={mode === "random"}
					onclick={() => (mode = "random")}
				>
					随机抽签
				</button>
				<button
					type="button"
					class:field__seg-item={true}
					class:field__seg-item--active={mode === "number"}
					onclick={() => (mode = "number")}
				>
					按签号查签
				</button>
			</div>
		</div>

		{#if mode === "number"}
			<div class="field">
				<label class="field__label" for="lottery-number">签号（1-92）</label>
				<input
					id="lottery-number"
					type="number"
					min="1"
					max="92"
					bind:value={numberInput}
					class="field__input"
				/>
			</div>
		{/if}

		<div class="field">
			<label class="field__label" for="lottery-time">求签时间（留空为当前时间）</label>
			<input
				id="lottery-time"
				type="datetime-local"
				bind:value={customTime}
				class="field__input"
			/>
		</div>

		<button type="button" class="panel__action" onclick={cast}>
			{mode === "random" ? "求签" : "查签"}
		</button>
		{#if error}
			<p class="panel__error">{error}</p>
		{/if}
	</div>

	{#if result}
		<div class="panel__result">
			<div class="panel__result-header">
				<h3 class="panel__result-title">{result.data.title}</h3>
				<p class="panel__result-meta">
					第 {result.data.number} 签 · 求签时间 {formatDate(result.data.timestamp)}
					（干支 {result.data.ganzhi.year} {result.data.ganzhi.month}
					{result.data.ganzhi.day} {result.data.ganzhi.hour}）
				</p>
			</div>

			<div class="panel__block panel__block--poem">
				<h4>签诗</h4>
				<pre class="panel__poem">{result.data.poem}</pre>
			</div>

			{#if result.data.story}
				<div class="panel__block">
					<h4>典故</h4>
					<p class="panel__text">{result.data.story}</p>
				</div>
			{/if}

			{#if result.data.details && Object.keys(result.data.details).length > 0}
				<div class="panel__block">
					<h4>解签</h4>
					<ul class="panel__list">
						{#each Object.entries(result.data.details) as [key, value]}
							<li>
								<strong>{key}：</strong>{value}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.panel {
		display: grid;
		gap: 1.25rem;
	}

	.panel__form {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		border: 2px solid var(--line-divider);
		border-radius: var(--radius-large);
	}

	.field {
		display: grid;
		gap: 0.35rem;
	}

	.field__label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--content-meta);
	}

	.field__input {
		padding: 0.5rem 0.7rem;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
		background: transparent;
		color: var(--deep-text);
		font-size: 0.9rem;
	}

	.field__input:focus {
		outline: none;
		border-color: var(--deep-text);
	}

	.field__seg {
		display: flex;
		gap: 0.5rem;
	}

	.field__seg-item {
		padding: 0.45rem 0.9rem;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
		background: transparent;
		color: var(--deep-text);
		font-size: 0.88rem;
		cursor: pointer;
		transition:
			border-color 0.2s,
			background-color 0.2s,
			color 0.2s;
	}

	.field__seg-item:hover {
		border-color: var(--deep-text);
	}

	.field__seg-item--active {
		border-color: var(--deep-text);
		background: var(--deep-text);
		color: var(--page-bg);
	}

	.panel__action {
		justify-self: start;
		padding: 0.55rem 1.6rem;
		border: 2px solid var(--deep-text);
		border-radius: var(--radius-medium);
		background: var(--deep-text);
		color: var(--page-bg);
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			opacity 0.2s,
			transform 0.1s;
	}

	.panel__action:hover {
		opacity: 0.85;
	}

	.panel__action:active {
		transform: translateY(1px);
	}

	.panel__error {
		color: var(--article-pinned-accent);
		font-size: 0.85rem;
	}

	.panel__result {
		display: grid;
		gap: 1rem;
		padding: 1rem;
		border: 2px solid var(--line-divider);
		border-radius: var(--radius-large);
	}

	.panel__result-header {
		display: grid;
		gap: 0.3rem;
	}

	.panel__result-title {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 700;
	}

	.panel__result-meta {
		margin: 0;
		color: var(--content-meta);
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.panel__block {
		padding: 0.7rem 0.85rem;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
	}

	.panel__block h4 {
		margin: 0 0 0.4rem;
		font-size: 0.85rem;
	}

	.panel__poem {
		margin: 0;
		white-space: pre-wrap;
		font-family: var(--font-serif, serif);
		font-size: 0.95rem;
		line-height: 1.9;
		color: var(--deep-text);
	}

	.panel__text {
		margin: 0;
		color: var(--deep-text);
		font-size: 0.88rem;
		line-height: 1.8;
	}

	.panel__list {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--content-meta);
		font-size: 0.82rem;
		line-height: 1.9;
	}
</style>
