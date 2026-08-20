<script lang="ts">
import LiuyaoPanel from "./LiuyaoPanel.svelte";
import LotteryPanel from "./LotteryPanel.svelte";
import Luopan from "./Luopan.svelte";
import MeihuaPanel from "./MeihuaPanel.svelte";
import TarotPanel from "./TarotPanel.svelte";
import XiaoliurenPanel from "./XiaoliurenPanel.svelte";

type MethodId = "liuyao" | "meihua" | "xiaoliuren" | "lottery" | "tarot";

const methods: { id: MethodId; label: string; desc: string }[] = [
	{ id: "liuyao", label: "六爻", desc: "京房八宫 · 火珠林纳甲" },
	{ id: "meihua", label: "梅花易数", desc: "邵氏心易 · 体用生克" },
	{ id: "xiaoliuren", label: "小六壬", desc: "六宫掌诀 · 时日定位" },
	{ id: "lottery", label: "观音灵签", desc: "三山国王 92 签" },
	{ id: "tarot", label: "塔罗", desc: "Rider-Waite 体系" },
];

let active = $state<MethodId>("liuyao");
</script>

<div class="divination-app">
	<div class="divination-app__luopan">
		<Luopan size={400} />
	</div>

	<div class="divination-app__tabs" role="tablist" aria-label="占卜方法">
		{#each methods as m (m.id)}
			<button
				type="button"
				role="tab"
				aria-selected={active === m.id}
				class="divination-app__tab"
				class:divination-app__tab--active={active === m.id}
				onclick={() => (active = m.id)}
			>
				<span class="divination-app__tab-label">{m.label}</span>
				<span class="divination-app__tab-desc">{m.desc}</span>
			</button>
		{/each}
	</div>

	<div class="divination-app__panel">
		{#if active === "liuyao"}
			<LiuyaoPanel />
		{:else if active === "meihua"}
			<MeihuaPanel />
		{:else if active === "xiaoliuren"}
			<XiaoliurenPanel />
		{:else if active === "lottery"}
			<LotteryPanel />
		{:else if active === "tarot"}
			<TarotPanel />
		{/if}
	</div>
</div>

<style>
	.divination-app__luopan {
		display: flex;
		justify-content: center;
		padding: 0.75rem 0 1rem;
	}

	.divination-app__tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.divination-app__tab {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		padding: 0.6rem 0.9rem;
		border: 2px solid var(--line-divider);
		border-radius: var(--radius-medium, 0.5rem);
		background: transparent;
		cursor: pointer;
		transition:
			border-color 0.2s,
			background-color 0.2s,
			color 0.2s;
	}

	.divination-app__tab:hover {
		border-color: var(--deep-text);
	}

	.divination-app__tab--active {
		border-color: var(--deep-text);
		background: var(--deep-text);
		color: var(--bg-color, #fff);
	}

	.divination-app__tab--active .divination-app__tab-desc {
		color: inherit;
		opacity: 0.75;
	}

	.divination-app__tab-label {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.divination-app__tab-desc {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.2;
	}

	/* ── 暗黑主题适配：active tab 白块 → 描边 + 微亮底 ── */
	:global(:root.dark) .divination-app__tab--active {
		background: color-mix(in oklch, var(--deep-text) 10%, transparent);
		color: var(--deep-text);
	}

</style>
