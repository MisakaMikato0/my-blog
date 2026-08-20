<script lang="ts">
import type { XiaoliurenResult } from "@/utils/divination";
import { createXiaoliurenReading } from "@/utils/divination";

let customTime = $state("");
let result = $state<XiaoliurenResult | null>(null);

function cast() {
	const customDate = customTime ? new Date(customTime) : undefined;
	result = createXiaoliurenReading({ customDate });
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}
</script>

<div class="panel">
	<div class="panel__form">
		<div class="field">
			<label class="field__label" for="xlr-time">占课时间（留空为当前时间）</label>
			<input
				id="xlr-time"
				type="datetime-local"
				bind:value={customTime}
				class="field__input"
			/>
		</div>
		<button type="button" class="panel__action" onclick={cast}>起课</button>
	</div>

	{#if result}
		<div class="panel__result">
			<div class="panel__result-header">
				<h3 class="panel__result-title">
					占得：{result.data.primary.name}
				</h3>
				<p class="panel__result-meta">
					农历 {result.data.lunarMonth}月 {result.data.lunarDay}日
					{result.data.isLeapMonth ? "（闰月）" : ""} · {result.data.hourLabel} ·
					干支 {result.data.ganzhi.year} {result.data.ganzhi.month}
					{result.data.ganzhi.day} {result.data.ganzhi.hour} · 占课时间
					{formatDate(result.data.timestamp)}
				</p>
			</div>

			<div class="xlr-flow">
				{#each result.data.palaceOrder as palace, i (i)}
					<div
						class="xlr-node"
						class:xlr-node--primary={palace.name === result.data.primary.name}
					>
						<span class="xlr-node__name">{palace.name}</span>
						<span class="xlr-node__verse">{palace.verse}</span>
					</div>
					{#if i < result.data.palaceOrder.length - 1}
						<span class="xlr-flow__arrow">→</span>
					{/if}
				{/each}
			</div>

			<div class="panel__grid">
				<div class="panel__block">
					<h4>三盘定位</h4>
					<ul class="panel__list">
						<li>月位：{result.data.sequence.month.name}</li>
						<li>日位：{result.data.sequence.day.name}</li>
						<li>
							时位：{result.data.sequence.hour.name}
							{#if result.data.primary.name === result.data.sequence.hour.name}
								（占得宫）
							{/if}
						</li>
					</ul>
				</div>
				<div class="panel__block">
					<h4>占得宫诀</h4>
					<p class="panel__verse">{result.data.primary.verse}</p>
				</div>
			</div>
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

	.xlr-flow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.xlr-node {
		display: grid;
		gap: 0.1rem;
		padding: 0.5rem 0.75rem;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
	}

	.xlr-node--primary {
		border-color: var(--deep-text);
		background: var(--deep-text);
		color: var(--page-bg);
	}

	.xlr-node--primary .xlr-node__verse {
		color: inherit;
		opacity: 0.8;
	}

	.xlr-node__name {
		font-size: 0.92rem;
		font-weight: 700;
	}

	.xlr-node__verse {
		font-size: 0.72rem;
		color: var(--content-meta);
	}

	.xlr-flow__arrow {
		color: var(--content-meta);
		font-size: 0.85rem;
	}

	.panel__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
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

	.panel__list {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--content-meta);
		font-size: 0.82rem;
		line-height: 1.7;
	}

	.panel__verse {
		margin: 0.3rem 0;
		color: var(--deep-text);
		font-size: 0.9rem;
		line-height: 1.8;
	}
</style>
