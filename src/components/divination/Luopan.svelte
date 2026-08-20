<script lang="ts">
interface Props {
	/** 罗盘显示尺寸（px） */
	size?: number;
}
let { size = 220 }: Props = $props();

const CX = 400;
const CY = 400;

// 环间分隔线
function dividers(count: number, r1: number, r2: number) {
	return Array.from({ length: count }, (_, i) => {
		const rad = ((i * 360) / count / 180) * Math.PI;
		return {
			x1: CX + r1 * Math.sin(rad),
			y1: CY - r1 * Math.cos(rad),
			x2: CX + r2 * Math.sin(rad),
			y2: CY - r2 * Math.cos(rad),
		};
	});
}
const div24 = dividers(24, 330, 370);
const div12 = dividers(12, 288, 326);
const div8 = dividers(8, 184, 208);

// 二十四山（金环，每 15° 一山）
const m24 = [
	"子",
	"癸",
	"丑",
	"艮",
	"寅",
	"甲",
	"卯",
	"乙",
	"辰",
	"巽",
	"巳",
	"丙",
	"午",
	"丁",
	"未",
	"坤",
	"申",
	"庚",
	"酉",
	"辛",
	"戌",
	"乾",
	"亥",
	"壬",
];
const r24Chars = m24.map((ch, i) => ({ ch, angle: i * 15 }));

// 十二地支（玉环，每 30° 一字）
const branches = [
	"子",
	"丑",
	"寅",
	"卯",
	"辰",
	"巳",
	"午",
	"未",
	"申",
	"酉",
	"戌",
	"亥",
];
const rBrChars = branches.map((ch, i) => ({ ch, angle: i * 30 }));

// 八卦（后天方位，卦爻线条：1 阳爻实线 / 0 阴爻断线）
const trigrams = [
	{ angle: 0, name: "坎", lines: [0, 1, 0] },
	{ angle: 45, name: "艮", lines: [1, 0, 0] },
	{ angle: 90, name: "震", lines: [0, 0, 1] },
	{ angle: 135, name: "巽", lines: [1, 1, 0] },
	{ angle: 180, name: "离", lines: [1, 0, 1] },
	{ angle: 225, name: "坤", lines: [0, 0, 0] },
	{ angle: 270, name: "兑", lines: [0, 1, 1] },
	{ angle: 315, name: "乾", lines: [1, 1, 1] },
];

// 天干（玫瑰环，每 45° 一字）
const stems = ["甲", "乙", "丙", "丁", "庚", "辛", "壬", "癸"];
const rStChars = stems.map((ch, i) => ({ ch, angle: i * 45 }));

// 天池四正
const dishChars = [
	{ ch: "子", angle: 0 },
	{ ch: "卯", angle: 90 },
	{ ch: "午", angle: 180 },
	{ ch: "酉", angle: 270 },
];

// ── 实时读数（顶部 12 点方向指向） ────────────────
const DIRECTIONS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
const R24_SPEED = 7; // 二十四山环 °/s（顺）
const RTR_SPEED = 19; // 八卦环 °/s（顺）

let readout = $state({ mountain: "子", trigram: "坎", direction: "北" });

$effect(() => {
	const start = performance.now();
	const timer = setInterval(() => {
		const t = (performance.now() - start) / 1000;
		const th24 = (((R24_SPEED * t) % 360) + 360) % 360;
		const thTr = (((RTR_SPEED * t) % 360) + 360) % 360;
		// 顶部绝对角度 0° 对应的环内角度 = (360 - θ) % 360
		const mi = Math.round(((360 - th24) % 360) / 15) % 24;
		const ti = Math.round(((360 - thTr) % 360) / 45) % 8;
		readout = {
			mountain: m24[mi],
			trigram: trigrams[ti].name,
			direction: DIRECTIONS[ti],
		};
	}, 250);
	return () => clearInterval(timer);
});
</script>

<div class="luopan" style={`--luopan-size: ${size}px`}>
	<svg
		class="luopan__svg"
		viewBox="0 0 800 800"
		width={size}
		height={size}
		aria-hidden="true"
	>
		<defs>
			<radialGradient id="luopan-glow" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="rgba(242,207,122,0.26)" />
				<stop offset="55%" stop-color="rgba(242,207,122,0.08)" />
				<stop offset="100%" stop-color="rgba(242,207,122,0)" />
			</radialGradient>
			<linearGradient id="luopan-gold" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#f9e3a0" />
				<stop offset="0.45" stop-color="#dfae55" />
				<stop offset="1" stop-color="#9c742c" />
			</linearGradient>
			<linearGradient id="luopan-jade" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#8fe3cf" />
				<stop offset="0.5" stop-color="#4fb79f" />
				<stop offset="1" stop-color="#2c7764" />
			</linearGradient>
			<radialGradient id="luopan-dish" cx="50%" cy="40%" r="70%">
				<stop offset="0%" stop-color="#33260f" />
				<stop offset="60%" stop-color="#221708" />
				<stop offset="100%" stop-color="#150e05" />
			</radialGradient>
		</defs>

		<!-- 呼吸光晕 -->
		<circle cx="400" cy="400" r="300" fill="url(#luopan-glow)" class="luopan-breath" />

		<!-- 外圈 -->
		<circle cx="400" cy="400" r="390" fill="none" stroke="#4a3a20" stroke-width="2" />
		<circle cx="400" cy="400" r="374" fill="none" stroke="#2f2616" stroke-width="1" />

		<!-- 刻度：72 小刻度 + 24 大刻度（pathLength=360 圆周分段） -->
		<circle
			cx="400"
			cy="400"
			r="381"
			fill="none"
			pathLength="360"
			stroke-dasharray="0.6 4.4"
			class="luopan-tick-minor"
			transform="rotate(-90 400 400)"
		/>
		<circle
			cx="400"
			cy="400"
			r="381"
			fill="none"
			pathLength="360"
			stroke-dasharray="1 14"
			class="luopan-tick-major"
			transform="rotate(-90 400 400)"
		/>

		<!-- 轨道虚线 -->
		<circle cx="400" cy="400" r="370" class="luopan-orbit" />
		<circle cx="400" cy="400" r="328" class="luopan-orbit luopan-orbit-anim" stroke-dasharray="1.5 7" />
		<circle cx="400" cy="400" r="286" class="luopan-orbit" />
		<circle cx="400" cy="400" r="240" class="luopan-orbit luopan-orbit-anim rev" stroke-dasharray="2 9" />
		<circle cx="400" cy="400" r="210" class="luopan-orbit" />

		<!-- 分隔线 -->
		{#each div24 as d (d.x1 + "-" + d.y1)}
			<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="luopan-divider" />
		{/each}
		{#each div12 as d (d.x1 + "-" + d.y1)}
			<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="luopan-divider" />
		{/each}
		{#each div8 as d (d.x1 + "-" + d.y1)}
			<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="luopan-divider" />
		{/each}

		<!-- 二十四山环（金，7°/s） -->
		<g class="luopan-ring luopan-ring--r24">
			{#each r24Chars as c (c.ch)}
				<g transform="rotate({c.angle})">
					<text
						y="-352"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="21"
						font-weight="600"
						class="luopan-gold"
					>{c.ch}</text>
				</g>
			{/each}
		</g>

		<!-- 十二地支环（玉，-11°/s） -->
		<g class="luopan-ring luopan-ring--rbr">
			{#each rBrChars as c (c.ch)}
				<g transform="rotate({c.angle})">
					<text
						y="-306"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="19"
						font-weight="600"
						class="luopan-jade"
					>{c.ch}</text>
				</g>
			{/each}
		</g>

		<!-- 八卦环（卦爻线条 + 卦名，19°/s） -->
		<g class="luopan-ring luopan-ring--rtr">
			{#each trigrams as t (t.name)}
				<g transform="rotate({t.angle})">
					{#each t.lines as solid, i (i)}
						{#if solid}
							<line
								x1={254 + i * 14}
								y1="-22"
								x2={254 + i * 14}
								y2="22"
								class="luopan-trigram"
							/>
						{:else}
							<line
								x1={254 + i * 14}
								y1="-22"
								x2={254 + i * 14}
								y2="-3"
								class="luopan-trigram"
							/>
							<line
								x1={254 + i * 14}
								y1="3"
								x2={254 + i * 14}
								y2="22"
								class="luopan-trigram"
							/>
						{/if}
					{/each}
					<text
						x="228"
						y="0"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="15"
						font-weight="600"
						class="luopan-gold-dim"
					>{t.name}</text>
				</g>
			{/each}
		</g>

		<!-- 天干环（玫瑰，-29°/s） -->
		<g class="luopan-ring luopan-ring--rst">
			{#each rStChars as c (c.ch)}
				<g transform="rotate({c.angle})">
					<text
						y="-196"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="17"
						font-weight="600"
						class="luopan-rose"
					>{c.ch}</text>
				</g>
			{/each}
		</g>

		<!-- 天池 -->
		<g>
			<circle cx="400" cy="400" r="156" fill="none" stroke="#6b5a33" stroke-width="1.5" />
			<circle cx="400" cy="400" r="150" fill="url(#luopan-dish)" stroke="#8a6a30" stroke-width="1" />
			<line x1="400" y1="250" x2="400" y2="550" class="luopan-dish-line" />
			<line x1="250" y1="400" x2="550" y2="400" class="luopan-dish-line" />
			{#each dishChars as c (c.ch)}
				<g transform="rotate({c.angle})">
					<text
						y="-118"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="20"
						font-weight="600"
						class="luopan-gold-dim"
					>{c.ch}</text>
				</g>
			{/each}
		</g>

		<!-- 指针（北白南红，微摆） -->
		<g transform="translate(400 400)">
			<g class="luopan-needle">
				<path d="M0,-92 L-11,-5 L0,0 L11,-5 Z" fill="#f3e3bd" />
				<path d="M0,92 L-11,5 L0,0 L11,5 Z" fill="#c94b33" />
				<circle r="8" fill="url(#luopan-gold)" />
				<circle r="3.2" fill="#241a10" />
			</g>
		</g>

		<!-- 顶部标记 -->
		<path d="M400,6 L408,21 L392,21 Z" fill="url(#luopan-gold)" stroke="#5c4717" stroke-width="1" />
	</svg>

	<p class="luopan__readout" aria-live="polite">
		指向 <span class="luopan__readout-val">{readout.mountain}</span>山 ·
		<span class="luopan__readout-val">{readout.trigram}</span>卦 ·
		<span class="luopan__readout-val">{readout.direction}</span>方
	</p>
</div>

<style>
	.luopan {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		--luopan-size: 220px;
	}

	.luopan__svg {
		width: var(--luopan-size);
		height: var(--luopan-size);
		display: block;
		filter: drop-shadow(0 0 18px rgba(255, 215, 74, 0.28));
	}

	.luopan__readout {
		margin: 0;
		color: var(--content-meta);
		font-size: 0.82rem;
		letter-spacing: 0.08em;
	}

	.luopan__readout-val {
		color: var(--deep-text);
		font-weight: 600;
	}

	/* ── 环配色 ─────────────────────────────────── */
	.luopan-gold {
		fill: url(#luopan-gold);
	}

	.luopan-gold-dim {
		fill: #d3ab5f;
		opacity: 0.9;
	}

	.luopan-jade {
		fill: url(#luopan-jade);
	}

	.luopan-rose {
		fill: #e3a06d;
	}

	.luopan-trigram {
		stroke: #e8b85c;
		stroke-width: 5;
		stroke-linecap: round;
	}

	.luopan-tick-minor {
		stroke: #6b5a33;
		stroke-width: 5;
		opacity: 0.5;
	}

	.luopan-tick-major {
		stroke: url(#luopan-gold);
		stroke-width: 10;
		opacity: 0.9;
	}

	.luopan-divider {
		stroke: #453619;
		stroke-width: 1;
		opacity: 0.55;
	}

	.luopan-orbit {
		fill: none;
		stroke: rgba(217, 171, 82, 0.35);
	}

	.luopan-dish-line {
		stroke: rgba(217, 171, 82, 0.28);
		stroke-width: 1;
	}

	/* ── 多环异速旋转 ───────────────────────────── */
	.luopan-ring {
		transform-box: view-box;
		transform-origin: 400px 400px;
	}

	.luopan-ring--r24 {
		animation: luopan-spin 51.4s linear infinite;
	}

	.luopan-ring--rbr {
		animation: luopan-spin-rev 32.7s linear infinite;
	}

	.luopan-ring--rtr {
		animation: luopan-spin 18.9s linear infinite;
	}

	.luopan-ring--rst {
		animation: luopan-spin-rev 12.4s linear infinite;
	}

	.luopan-orbit-anim {
		animation: luopan-spin 38s linear infinite;
		transform-box: fill-box;
		transform-origin: center;
	}

	.luopan-orbit-anim.rev {
		animation-direction: reverse;
		animation-duration: 52s;
	}

	.luopan-breath {
		animation: luopan-glow 4.5s ease-in-out infinite;
	}

	@keyframes luopan-glow {
		from {
			opacity: 0.55;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1.04);
		}
	}

	.luopan-needle {
		animation: luopan-sway 2.4s ease-in-out infinite alternate;
	}

	@keyframes luopan-sway {
		from {
			transform: rotate(-7deg);
		}
		to {
			transform: rotate(7deg);
		}
	}

	@keyframes luopan-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes luopan-spin-rev {
		to {
			transform: rotate(-360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.luopan-ring,
		.luopan-orbit-anim,
		.luopan-breath,
		.luopan-needle {
			animation: none;
		}
	}
</style>
