<script lang="ts">
import type { TarotResult, TarotSpreadType } from "@/utils/divination";
import { createTarotReading } from "@/utils/divination";
import AiInterpretBox from "./AiInterpretBox.svelte";

const spreadOptions: { id: TarotSpreadType; label: string }[] = [
	{ id: "single", label: "单牌指引" },
	{ id: "three", label: "时间流（三张）" },
	{ id: "love", label: "爱情牌阵" },
	{ id: "career", label: "事业牌阵" },
	{ id: "decision", label: "选择牌阵" },
	{ id: "celtic", label: "凯尔特十字" },
	{ id: "year", label: "年运牌阵" },
];

let spreadType = $state<TarotSpreadType>("three");
let result = $state<TarotResult | null>(null);

function cast() {
	result = createTarotReading({ spreadType });
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}
</script>

<div class="panel">
	<div class="panel__form">
		<div class="field">
			<label class="field__label" for="tarot-spread">牌阵</label>
			<select
				id="tarot-spread"
				bind:value={spreadType}
				class="field__input field__input--select"
			>
				{#each spreadOptions as opt (opt.id)}
					<option value={opt.id}>{opt.label}</option>
				{/each}
			</select>
		</div>
		<button type="button" class="panel__action" onclick={cast}>抽牌</button>
	</div>

	{#if result}
		<div class="panel__result">
			<div class="panel__result-header">
				<h3 class="panel__result-title">{result.data.spreadName}</h3>
				<p class="panel__result-meta">
					抽牌时间 {formatDate(result.data.timestamp)}
					{#if result.data.draw?.method}
						· {result.data.draw.method}
					{/if}
				</p>
			</div>

			<div class="tarot-grid">
				{#each result.data.cards as card, i (i)}
					<div class="tarot-card" class:tarot-card--reversed={card.reversed}>
						<span class="tarot-card__position">{card.position}</span>
						<div class="tarot-card__image-wrap">
							<img
								class="tarot-card__image"
								class:is-reversed={card.reversed}
								src="/images/tarot/{card.number - 1}.jpg"
								alt="{card.name}{card.reversed ? "（逆位）" : ""}"
								loading="lazy"
								width="180"
								height="315"
							/>
						</div>
						<span class="tarot-card__name">
							{card.name}
							<span class="tarot-card__orientation">
								{card.reversed ? "逆位" : "正位"}
							</span>
						</span>
						{#if card.keywords?.length}
							<span class="tarot-card__keywords">
								{card.keywords.slice(0, 4).join(" · ")}
							</span>
						{/if}
						{#if card.element}
							<span class="tarot-card__element">{card.element}</span>
						{/if}
					</div>
				{/each}
			</div>
			</div>
			<AiInterpretBox method="tarot" data={result.data} />
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

	.field__input--select {
		width: 100%;
		max-width: 320px;
		cursor: pointer;
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

	.tarot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 0.75rem;
	}

	.tarot-card {
		display: grid;
		gap: 0.3rem;
		padding: 0.8rem 0.9rem;
		border: 1.5px solid var(--line-divider);
		border-radius: var(--radius-medium);
	}

	.tarot-card--reversed {
		border-style: dashed;
	}

	.tarot-card__image-wrap {
		display: flex;
		justify-content: center;
		align-items: center;
		aspect-ratio: 180 / 315;
		overflow: hidden;
		border-radius: 6px;
		background: color-mix(in srgb, var(--line-divider) 30%, transparent);
	}

	.tarot-card__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.2s ease;
	}

	.tarot-card__image.is-reversed {
		transform: rotate(180deg);
	}

	.tarot-card__position {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--content-meta);
		letter-spacing: 0.04em;
	}

	.tarot-card__name {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.4;
	}

	.tarot-card__orientation {
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--content-meta);
	}

	.tarot-card__keywords {
		font-size: 0.78rem;
		color: var(--content-meta);
		line-height: 1.6;
	}

	.tarot-card__element {
		font-size: 0.72rem;
		color: var(--content-meta);
		opacity: 0.7;
	}
</style>
