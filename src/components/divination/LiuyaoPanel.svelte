<script lang="ts">
import type { LiuyaoResult } from "@/utils/divination";
import { createLiuyaoReading } from "@/utils/divination";
import {
	deriveChangedLines,
	deriveInterLines,
	type HexagramDiagramItem,
	linesFromYaosDetail,
} from "@/utils/divination/hexagram-diagram";
import AiInterpretBox from "./AiInterpretBox.svelte";
import HexagramDiagram from "./HexagramDiagram.svelte";

type Method = "time" | "manual";

let method = $state<Method>("time");
let customTime = $state("");
let manualYaos = $state("7,8,7,8,7,8");
let question = $state("");
let result = $state<LiuyaoResult | null>(null);
let error = $state("");

function parseYaos(raw: string): number[] | null {
	const values = raw
		.split(/[,，\s]+/)
		.map((s) => Number.parseInt(s, 10))
		.filter((n) => Number.isFinite(n));
	if (values.length !== 6 || values.some((n) => ![6, 7, 8, 9].includes(n))) {
		return null;
	}
	return values;
}

function cast() {
	error = "";
	const customDate = customTime ? new Date(customTime) : undefined;
	if (method === "manual") {
		const yaos = parseYaos(manualYaos);
		if (!yaos) {
			error = "请输入 6 个爻值（每爻 6/7/8/9，逗号分隔）";
			return;
		}
		result = createLiuyaoReading({ customDate, method, yaos });
	} else {
		result = createLiuyaoReading({ customDate });
	}
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

function buildHexagramItems(data: LiuyaoResult["data"]): HexagramDiagramItem[] {
	const original = linesFromYaosDetail(data.yaosDetail);
	const items: HexagramDiagramItem[] = [
		{ name: data.originalName, note: "本卦", lines: original },
	];
	if (data.changedName) {
		items.push({
			name: data.changedName,
			note: "变卦",
			lines: deriveChangedLines(original),
		});
	}
	if (data.interName) {
		items.push({
			name: data.interName,
			note: "互卦",
			lines: deriveInterLines(original),
		});
	}
	return items;
}
</script>

<div class="panel">
	<div class="panel__form">
		<div class="field">
			<label class="field__label" for="liuyao-method">起卦方式</label>
			<div class="field__seg">
				<button
					type="button"
					class:field__seg-item={true}
					class:field__seg-item--active={method === "time"}
					onclick={() => (method = "time")}
				>
					时间起卦
				</button>
				<button
					type="button"
					class:field__seg-item={true}
					class:field__seg-item--active={method === "manual"}
					onclick={() => (method = "manual")}
				>
					手工三钱法
				</button>
			</div>
		</div>

		<div class="field">
			<label class="field__label" for="liuyao-time">起卦时间（留空为当前时间）</label>
			<input
				id="liuyao-time"
				type="datetime-local"
				bind:value={customTime}
				class="field__input"
			/>
		</div>

		{#if method === "manual"}
			<div class="field">
				<label class="field__label" for="liuyao-yaos">
					爻值（初爻→上爻，6=老阴 7=少阳 8=少阴 9=老阳）
				</label>
				<input
					id="liuyao-yaos"
					type="text"
					bind:value={manualYaos}
					class="field__input"
					placeholder="如 6,7,8,9,7,8"
				/>
			</div>
		{/if}

		<div class="field">
			<label class="field__label" for="liuyao-question">所问何事</label>
			<input
				id="liuyao-question"
				type="text"
				bind:value={question}
				class="field__input"
				placeholder="如：近期事业是否顺利？（留空则以心默问）"
				maxlength="100"
			/>
			<span class="field__hint">先定所问，再行起卦 —— 无疑不占</span>
		</div>

		<button type="button" class="panel__action" onclick={cast}>起卦</button>
		{#if error}
			<p class="panel__error">{error}</p>
		{/if}
	</div>

	{#if result}
		<div class="panel__result">
			<div class="panel__result-header">
				<h3 class="panel__result-title">
					{result.data.originalName}
					{#if result.data.changedName}
						<span class="panel__result-arrow">→ {result.data.changedName}</span>
					{/if}
				</h3>
				<p class="panel__result-meta">
					干支 {result.data.ganzhi.year} {result.data.ganzhi.month}
					{result.data.ganzhi.day} {result.data.ganzhi.hour} · 起卦时间
					{formatDate(result.data.timestamp)} · {result.data.palace.name}宫
					{result.data.palace.wuxing} · {result.data.palaceStage ?? ""}
				</p>
				{#if question.trim()}
					<p class="panel__result-question">所问：{question.trim()}</p>
				{/if}
			</div>

			<HexagramDiagram hexagrams={buildHexagramItems(result.data)} />

			{#if result.data.specialPattern || result.data.specialAdvice}
				<div class="panel__callout">
					<strong>{result.data.specialPattern ?? "提示"}</strong>
					{#if result.data.specialAdvice}
						：{result.data.specialAdvice}
					{/if}
				</div>
			{/if}

			{#if result.data.hexagramRelations?.transition}
				<div class="panel__callout">
					{result.data.hexagramRelations.transition}
				</div>
			{/if}

			{#if result.data.fanfuRelations?.labels?.length}
				<div class="panel__callout">
					{result.data.fanfuRelations.labels.join("、")}
				</div>
			{/if}

			<div class="yao-table">
				<div class="yao-table__row yao-table__row--head">
					<span>爻位</span>
					<span>爻象</span>
					<span>六神</span>
					<span>纳甲</span>
					<span>五行</span>
					<span>六亲</span>
					<span>世应</span>
					<span>状态</span>
				</div>
				{#each result.data.yaosDetail as yao, i (i)}
					<div
						class="yao-table__row"
						class:yao-table__row--moving={yao.isChanging}
						class:yao-table__row--world={yao.isWorld}
						class:yao-table__row--response={yao.isResponse}
					>
						<span>{yao.position}爻</span>
						<span class="yao-table__yao">
							{yao.yaoType === "阳" ? "▅▅▅▅▅" : "▅▅ ▅▅"}{yao.isChanging ? (yao.yaoType === "阳" ? " ○" : " ×") : ""}
						</span>
						<span>{yao.sixGod}</span>
						<span>{yao.najiaDizhi}</span>
						<span>{yao.wuxing}</span>
						<span>{yao.sixRelative}</span>
						<span>
							{yao.isWorld ? "世" : ""}{yao.isResponse ? "应" : ""}
						</span>
						<span class="yao-table__status">
							{#if yao.isVoid}旬空{/if}
							{#if yao.changeRelations?.length}
								{yao.changeRelations.join("、")}
							{/if}
							{#if yao.changeDirection}
								{yao.changeDirection}
							{/if}
						</span>
					</div>
				{/each}
			</div>

			<div class="panel__grid">
				{#if result.data.hiddenSpirits?.length}
					<div class="panel__block">
						<h4>伏神</h4>
						<ul class="panel__list">
							{#each result.data.hiddenSpirits as h, i (i)}
								<li>
									{h.sixRelative}（{h.najiaDizhi}
									{h.wuxing}）伏于 {h.underYao.position}爻
									{h.underYao.sixRelative}
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if result.data.guaShen}
					<div class="panel__block">
						<h4>卦身</h4>
						<p>
							{result.data.guaShen.branch}
							{result.data.guaShen.sixRelative}，位于第
							{result.data.guaShen.position}爻
						</p>
					</div>
				{/if}

				{#if result.data.sanheWithDay || result.data.sanheWithMonth}
					<div class="panel__block">
						<h4>三合局</h4>
						<ul class="panel__list">
							{#if result.data.sanheWithDay}
								<li>与日：{result.data.sanheWithDay.group}</li>
							{/if}
							{#if result.data.sanheWithMonth}
								<li>与月：{result.data.sanheWithMonth.group}</li>
							{/if}
						</ul>
					</div>
				{/if}

				{#if result.data.sanxingInYaos?.length}
					<div class="panel__block">
						<h4>三刑</h4>
						<ul class="panel__list">
							{#each result.data.sanxingInYaos as s, i (i)}
								<li>{s.branches.join("、")}（{s.type}）</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
		<AiInterpretBox method="liuyao" data={result.data} question={question.trim()} />
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

	.field__hint {
		font-size: 0.75rem;
		color: var(--content-meta);
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
	}

	.panel__result-meta {
		margin: 0;
		color: var(--content-meta);
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.panel__result-question {
		margin: 0;
		padding: 0.4rem 0.6rem;
		border-left: 3px solid var(--deep-text);
		background: var(--btn-regular-bg-hover);
		color: var(--deep-text);
		font-size: 0.88rem;
	}

	.panel__callout {
		padding: 0.55rem 0.8rem;
		border: 1px dashed var(--line-divider);
		border-radius: var(--radius-medium);
		color: var(--deep-text);
		font-size: 0.88rem;
		line-height: 1.6;
	}

	.yao-table {
		display: grid;
		gap: 0;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
		overflow: hidden;
		font-size: 0.82rem;
	}

	.yao-table__row {
		display: grid;
		grid-template-columns: 3.2rem 6.5rem 3.4rem 3rem 3rem 3.6rem 3rem 1fr;
		align-items: center;
		gap: 0.25rem;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid var(--line-divider);
	}

	@media (max-width: 640px) {
		.yao-table {
			overflow-x: auto;
		}

		.yao-table__row {
			grid-template-columns: 2.8rem 5.2rem 3rem 2.6rem 2.6rem 3.2rem 2.6rem 1fr;
			min-width: 480px;
		}
	}

	.yao-table__row:last-child {
		border-bottom: none;
	}

	.yao-table__row--head {
		background: var(--codeblock-topbar-bg);
		font-weight: 600;
		color: var(--content-meta);
	}

	.yao-table__row--moving {
		background: var(--selection-bg);
	}

	.yao-table__row--world {
		box-shadow: inset 3px 0 0 var(--deep-text);
	}

	.yao-table__row--response {
		box-shadow: inset -3px 0 0 var(--line-divider);
	}

	.yao-table__yao {
		font-family: var(--font-mono, monospace);
		white-space: nowrap;
	}

	.yao-table__status {
		color: var(--content-meta);
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
</style>
