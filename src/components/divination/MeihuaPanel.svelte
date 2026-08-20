<script lang="ts">
import type { MeihuaResult } from "@/utils/divination";
import { createMeihuaReading } from "@/utils/divination";
import AiInterpretBox from "./AiInterpretBox.svelte";

type Method = "time" | "number";

let method = $state<Method>("time");
let customTime = $state("");
let numberInput = $state("123");
let result = $state<MeihuaResult | null>(null);
let error = $state("");

function cast() {
	error = "";
	const customDate = customTime ? new Date(customTime) : undefined;
	if (method === "number") {
		const num = Number.parseInt(numberInput, 10);
		if (!Number.isFinite(num) || num < 1 || num > 9999) {
			error = "请输入 1-9999 之间的数字";
			return;
		}
		result = createMeihuaReading({ customDate, method, number: num });
	} else {
		result = createMeihuaReading({ customDate });
	}
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}
</script>

<div class="panel">
	<div class="panel__form">
		<div class="field">
			<label class="field__label" for="meihua-method">起卦方式</label>
			<div class="field__seg">
				<button
					type="button"
					class:field__seg-item={true}
					class:field__seg-item--active={method === "time"}
					onclick={() => (method = "time")}
				>
					年月日时起卦
				</button>
				<button
					type="button"
					class:field__seg-item={true}
					class:field__seg-item--active={method === "number"}
					onclick={() => (method = "number")}
				>
					数字起卦
				</button>
			</div>
		</div>

		{#if method === "number"}
			<div class="field">
				<label class="field__label" for="meihua-number">数字（1-9999）</label>
				<input
					id="meihua-number"
					type="number"
					min="1"
					max="9999"
					bind:value={numberInput}
					class="field__input"
				/>
			</div>
		{:else}
			<div class="field">
				<label class="field__label" for="meihua-time">起卦时间（留空为当前时间）</label>
				<input
					id="meihua-time"
					type="datetime-local"
					bind:value={customTime}
					class="field__input"
				/>
			</div>
		{/if}

		<button type="button" class="panel__action" onclick={cast}>起卦</button>
		{#if error}
			<p class="panel__error">{error}</p>
		{/if}
	</div>

	{#if result}
		<div class="panel__result">
			<div class="panel__result-header">
				<h3 class="panel__result-title">
					{result.data.mainHexagram.name}
					<span class="panel__result-arrow">
						{#if result.data.interHexagram}
							互 {result.data.interHexagram.name}
						{/if}
						{#if result.data.changedHexagram}
							→ 变 {result.data.changedHexagram.name}
						{/if}
					</span>
				</h3>
				<p class="panel__result-meta">
					干支 {result.data.ganzhi.year} {result.data.ganzhi.month}
					{result.data.ganzhi.day} {result.data.ganzhi.hour} · 起卦时间
					{formatDate(result.data.timestamp)} ·
					{result.data.calculation?.method ?? ""}
				</p>
			</div>

			<div class="meihua-grid">
				<div class="meihua-card">
					<h4>体卦（{result.data.tiGua.name}）</h4>
					<p>
						{result.data.tiGua.name} · {result.data.tiGua.element} ·
						{result.data.tiGua.nature}
					</p>
					<p class="meihua-card__meta">月令状态：{result.data.analysis.tiSeasonState}</p>
				</div>
				<div class="meihua-card">
					<h4>用卦（{result.data.yongGua.name}）</h4>
					<p>
						{result.data.yongGua.name} · {result.data.yongGua.element} ·
						{result.data.yongGua.nature}
					</p>
					<p class="meihua-card__meta">月令状态：{result.data.analysis.yongSeasonState}</p>
				</div>
				<div class="meihua-card meihua-card--relation">
					<h4>体用关系</h4>
					<p class="meihua-card__relation">{result.data.analysis.tiYongRelation}</p>
					<p class="meihua-card__meta">
						互体 {result.data.interTiGua?.name ?? "-"} 与
						{result.data.analysis.inter1Relation}；互用
						{result.data.interYongGua?.name ?? "-"} 与
						{result.data.analysis.inter2Relation}
					</p>
					<p class="meihua-card__meta">
						变卦关系：{result.data.analysis.changedRelation}
						（{result.data.analysis.changedTiYongRelation}）
					</p>
				</div>
			</div>

			<div class="panel__callout">
				动爻：第 {result.data.movingYao.position}爻（{result.data.movingYao.description}）
			</div>

			{#if result.data.mainHexagram.yongCi || result.data.mainHexagram.yaoCi?.length}
				<div class="panel__block">
					<h4>卦辞 / 爻辞</h4>
					{#if result.data.mainHexagram.yongCi}
						<p class="panel__verse">{result.data.mainHexagram.yongCi}</p>
					{/if}
					{#if result.data.movingYao && result.data.movingYao.position > 0}
						<p class="panel__verse">
							{result.data.movingYao.position}爻：{result.data.mainHexagram
								.movingYaoCi ?? ""}
						</p>
					{/if}
				</div>
				{/if}
				<AiInterpretBox method="meihua" data={result.data} />
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

	.panel__result-arrow {
		color: var(--content-meta);
		font-weight: 500;
		font-size: 1rem;
	}

	.panel__result-meta {
		margin: 0;
		color: var(--content-meta);
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.meihua-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.meihua-card {
		padding: 0.7rem 0.85rem;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
	}

	.meihua-card h4 {
		margin: 0 0 0.4rem;
		font-size: 0.85rem;
	}

	.meihua-card p {
		margin: 0.2rem 0;
		font-size: 0.88rem;
		line-height: 1.5;
	}

	.meihua-card__relation {
		font-size: 1.1rem !important;
		font-weight: 700;
	}

	.meihua-card__meta {
		color: var(--content-meta);
		font-size: 0.78rem !important;
	}

	.panel__callout {
		padding: 0.55rem 0.8rem;
		border: 1px dashed var(--line-divider);
		border-radius: var(--radius-medium);
		color: var(--deep-text);
		font-size: 0.88rem;
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

	.panel__verse {
		margin: 0.3rem 0;
		color: var(--deep-text);
		font-size: 0.9rem;
		line-height: 1.8;
	}
</style>
