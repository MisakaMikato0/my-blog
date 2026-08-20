<script lang="ts">
import type { HexagramDiagramItem } from "@/utils/divination/hexagram-diagram";

interface Props {
	hexagrams: HexagramDiagramItem[];
}

let { hexagrams }: Props = $props();

/** 动爻标记：阳动为老阳 ○，阴动为老阴 × */
function movingMark(line: { type: "阳" | "阴"; changing: boolean }): string {
	if (!line.changing) return "";
	return line.type === "阳" ? "○" : "×";
}
</script>

<div class="hexagram-diagram">
	{#each hexagrams as hex, i (hex.name + i)}
		<div class="hexagram">
			<div class="hexagram__name">
				{#if hex.note}<span class="hexagram__note">{hex.note}</span>{/if}
				<span class="hexagram__title">{hex.name}</span>
			</div>
			<div class="hexagram__lines">
				{#each [...hex.lines].reverse() as line, idx (idx)}
					<div class="hexagram__row">
						<span
							class="hexagram__yao"
							class:is-yang={line.type === "阳"}
							class:is-yin={line.type === "阴"}
							class:is-changing={line.changing}
						></span>
						{#if line.changing}
							<span class="hexagram__mark">{movingMark(line)}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.hexagram-diagram {
		display: flex;
		flex-wrap: wrap;
		gap: 1.2rem 1.5rem;
		align-items: flex-start;
	}

	.hexagram {
		display: grid;
		gap: 0.35rem;
	}

	.hexagram__name {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		font-size: 0.9rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.hexagram__note {
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--content-meta);
	}

	.hexagram__lines {
		display: grid;
		gap: 0.3rem;
	}

	.hexagram__row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		height: 0.7rem;
	}

	.hexagram__yao {
		display: block;
		height: 0.28rem;
		width: 3.2rem;
		border-radius: 1px;
		background: currentColor;
	}

	.hexagram__yao.is-yin {
		background: linear-gradient(
			to right,
			currentColor 0%,
			currentColor 38%,
			transparent 38%,
			transparent 62%,
			currentColor 62%,
			currentColor 100%
		);
	}

	.hexagram__mark {
		font-size: 0.72rem;
		line-height: 1;
		color: var(--content-meta);
	}

	.hexagram__yao.is-changing {
		box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 40%, transparent);
	}
</style>
