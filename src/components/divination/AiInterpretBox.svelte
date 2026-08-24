<script lang="ts">
import type { DivinationData } from "mingyu-core/divination";
import type { DivinationMethodId } from "mingyu-core/divination/config";
import { fade } from "svelte/transition";

type SupportedMethod = Exclude<DivinationMethodId, "random">;

interface Props {
	method: SupportedMethod;
	data: DivinationData;
	/** 起卦前定的"所问之事"，作为解卦输入框的初始值 */
	question?: string;
}

let { method, data, question: initialQuestion = "" }: Props = $props();

let question = $state(initialQuestion);
let status: "idle" | "loading" | "done" | "error" = $state("idle");
let resultText = $state("");
let promptText = $state("");
let copied = $state(false);
let errorText = $state("");

// ── 风水罗盘 loading 数据 ─────────────────────────
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

// 环绕光点
const sparks = Array.from({ length: 6 }, (_, i) => ({
	angle: i * 60 + 20,
	duration: 2.4 + (i % 3) * 0.5,
	delay: i * 0.15,
}));

// 面板重新起卦（prop 变化）时，用新的"所问之事"重置解卦输入框
$effect(() => {
	question = initialQuestion;
});

async function interpret() {
	if (status === "loading") return;
	status = "loading";
	errorText = "";
	resultText = "";
	promptText = "";
	try {
		const response = await fetch("/api/divination/interpret", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				method,
				data,
				question: question.trim() || undefined,
			}),
		});
		const payload = (await response.json()) as {
			text?: string;
			prompt?: string;
			error?: string;
		};
		if (!response.ok) {
			throw new Error(payload.error ?? `请求失败（${response.status}）`);
		}

		// 兜底模式：后端未配 Key，返回官方排盘提示词供用户自行复制给 AI
		if (payload.prompt) {
			promptText = payload.prompt;
			status = "done";
			return;
		}

		if (!payload.text) {
			throw new Error("响应为空，请稍后重试");
		}
		resultText = payload.text;
		status = "done";
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "未知错误，请稍后重试";
		// fetch 网络层失败（断网/跨域/超时等）统一友好提示
		errorText =
			error instanceof TypeError ||
			message === "Failed to fetch" ||
			message === "Load failed"
				? "网络异常，请稍后重试"
				: message;
		status = "error";
	}
}

async function copyPrompt() {
	try {
		await navigator.clipboard.writeText(promptText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	} catch {
		// 剪贴板不可用时忽略（如非 HTTPS 环境）
	}
}
</script>

<div class="ai-box">
	<div class="ai-box__header">
		<span class="ai-box__title"> 解卦（偷偷发给幽幽子）</span>
		<span class="ai-box__badge">Beta</span>
	</div>
	<div class="ai-box__question">
		{#if question.trim()}
			<span class="ai-box__question-text" title="起卦前所定之事">所问：{question.trim()}</span>
		{:else}
			<input
				type="text"
				bind:value={question}
				placeholder="所问何事？（留空则由 AI 泛解）"
				maxlength="200"
				disabled={status === "loading"}
				onkeydown={(e) => {
					if (e.key === "Enter") interpret();
				}}
			/>
		{/if}
		<button
			type="button"
			class="ai-box__button"
			disabled={status === "loading"}
			onclick={interpret}
		>
			{status === "loading" ? "幽幽子解卦中…" : "解卦"}
		</button>
	</div>

	{#if status === "error"}
		<p class="ai-box__error">{errorText}</p>
	{/if}

	{#if status === "done"}
		{#if promptText}
			<p class="ai-box__fallback-note">
				站长暂未开启 AI 一键解卦。以下是根据你的卦象生成的专业解卦提示词，
				复制发给任意 AI（如 DeepSeek、豆包、ChatGPT）即可获得解读：
			</p>
			<div class="ai-box__result ai-box__result--prompt">{promptText}</div>
			<button type="button" class="ai-box__copy-btn" onclick={copyPrompt}>
				{copied ? "已复制 ✓" : "复制提示词"}
			</button>
		{:else}
			<div class="ai-box__result">{resultText}</div>
		{/if}
	{/if}

	{#if status === "idle"}
		<p class="ai-box__hint">
			由 幽幽子 基于传统法理生成白话解读，结果仅供参考，不构成决策建议。
		</p>
	{/if}
</div>

{#if status === "loading"}
	<div
		class="compass-overlay"
		role="status"
		aria-live="polite"
		transition:fade={{ duration: 160 }}
	>
		<div class="compass-scene">
			<div class="compass" aria-hidden="true">
				<svg
					class="compass-svg"
					viewBox="0 0 800 800"
					width="264"
					height="264"
				>
					<defs>
						<radialGradient id="compass-glow" cx="50%" cy="50%" r="50%">
							<stop offset="0%" stop-color="rgba(242,207,122,0.26)" />
							<stop offset="55%" stop-color="rgba(242,207,122,0.08)" />
							<stop offset="100%" stop-color="rgba(242,207,122,0)" />
						</radialGradient>
						<linearGradient id="compass-gold" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stop-color="#f9e3a0" />
							<stop offset="0.45" stop-color="#dfae55" />
							<stop offset="1" stop-color="#9c742c" />
						</linearGradient>
						<linearGradient id="compass-jade" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stop-color="#8fe3cf" />
							<stop offset="0.5" stop-color="#4fb79f" />
							<stop offset="1" stop-color="#2c7764" />
						</linearGradient>
						<radialGradient id="compass-dish" cx="50%" cy="40%" r="70%">
							<stop offset="0%" stop-color="#33260f" />
							<stop offset="60%" stop-color="#221708" />
							<stop offset="100%" stop-color="#150e05" />
						</radialGradient>
					</defs>

					<!-- 呼吸光晕 -->
					<circle
						cx="400"
						cy="400"
						r="300"
						fill="url(#compass-glow)"
						class="compass-breath"
					/>

					<!-- 外圈 -->
					<circle
						cx="400"
						cy="400"
						r="390"
						fill="none"
						stroke="#4a3a20"
						stroke-width="2"
					/>
					<circle
						cx="400"
						cy="400"
						r="374"
						fill="none"
						stroke="#2f2616"
						stroke-width="1"
					/>

					<!-- 刻度：72 小刻度 + 24 大刻度（pathLength=360 圆周分段） -->
					<circle
						cx="400"
						cy="400"
						r="381"
						fill="none"
						pathLength="360"
						stroke-dasharray="0.6 4.4"
						class="tick-minor"
						transform="rotate(-90 400 400)"
					/>
					<circle
						cx="400"
						cy="400"
						r="381"
						fill="none"
						pathLength="360"
						stroke-dasharray="1 14"
						class="tick-major"
						transform="rotate(-90 400 400)"
					/>

					<!-- 轨道虚线 -->
					<circle cx="400" cy="400" r="370" class="orbit" />
					<circle
						cx="400"
						cy="400"
						r="328"
						class="orbit orbit-anim"
						stroke-dasharray="1.5 7"
					/>
					<circle cx="400" cy="400" r="286" class="orbit" />
					<circle
						cx="400"
						cy="400"
						r="240"
						class="orbit orbit-anim rev"
						stroke-dasharray="2 9"
					/>
					<circle cx="400" cy="400" r="210" class="orbit" />

					<!-- 分隔线 -->
					{#each div24 as d (d.x1 + "-" + d.y1)}
						<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="divider" />
					{/each}
					{#each div12 as d (d.x1 + "-" + d.y1)}
						<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="divider" />
					{/each}
					{#each div8 as d (d.x1 + "-" + d.y1)}
						<line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} class="divider" />
					{/each}

					<!-- 二十四山环（金，7°/s） -->
					<g class="compass-ring compass-ring--r24">
						{#each r24Chars as c (c.ch)}
							<g transform="translate(400 400) rotate({c.angle})">
								<text
									y="-352"
									text-anchor="middle"
									dominant-baseline="central"
									font-size="21"
									font-weight="600"
									class="ring-gold"
								>{c.ch}</text>
							</g>
						{/each}
					</g>

					<!-- 十二地支环（玉，-11°/s） -->
					<g class="compass-ring compass-ring--rbr">
						{#each rBrChars as c (c.ch)}
							<g transform="translate(400 400) rotate({c.angle})">
								<text
									y="-306"
									text-anchor="middle"
									dominant-baseline="central"
									font-size="19"
									font-weight="600"
									class="ring-jade"
								>{c.ch}</text>
							</g>
						{/each}
					</g>

					<!-- 八卦环（卦爻线条 + 卦名，19°/s） -->
					<g class="compass-ring compass-ring--rtr">
						{#each trigrams as t (t.name)}
							<g transform="translate(400 400) rotate({t.angle})">
								{#each t.lines as solid, i (i)}
									{#if solid}
										<line
											x1="-22"
											y1={-254 - i * 14}
											x2="22"
											y2={-254 - i * 14}
											class="trigram-line"
										/>
									{:else}
										<line
											x1="-22"
											y1={-254 - i * 14}
											x2="-3"
											y2={-254 - i * 14}
											class="trigram-line"
										/>
										<line
											x1="3"
											y1={-254 - i * 14}
											x2="22"
											y2={-254 - i * 14}
											class="trigram-line"
										/>
									{/if}
								{/each}
								<text
									x="0"
									y="-228"
									text-anchor="middle"
									dominant-baseline="central"
									font-size="15"
									font-weight="600"
									class="ring-gold-dim"
								>{t.name}</text>
							</g>
						{/each}
					</g>

					<!-- 天干环（玫瑰，-29°/s） -->
					<g class="compass-ring compass-ring--rst">
						{#each rStChars as c (c.ch)}
							<g transform="translate(400 400) rotate({c.angle})">
								<text
									y="-196"
									text-anchor="middle"
									dominant-baseline="central"
									font-size="17"
									font-weight="600"
									class="ring-rose"
								>{c.ch}</text>
							</g>
						{/each}
					</g>

					<!-- 天池 -->
					<g>
						<circle
							cx="400"
							cy="400"
							r="156"
							fill="none"
							stroke="#6b5a33"
							stroke-width="1.5"
						/>
						<circle
							cx="400"
							cy="400"
							r="150"
							fill="url(#compass-dish)"
							stroke="#8a6a30"
							stroke-width="1"
						/>
						<line x1="400" y1="250" x2="400" y2="550" class="dish-line" />
						<line x1="250" y1="400" x2="550" y2="400" class="dish-line" />
						{#each dishChars as c (c.ch)}
							<g transform="translate(400 400) rotate({c.angle})">
								<text
									y="-118"
									text-anchor="middle"
									dominant-baseline="central"
									font-size="20"
									font-weight="600"
									class="ring-gold-dim"
								>{c.ch}</text>
							</g>
						{/each}
					</g>

					<!-- 指针（北白南红，微摆） -->
					<g transform="translate(400 400)">
						<g class="compass-needle">
							<path d="M0,-92 L-11,-5 L0,0 L11,-5 Z" fill="#f3e3bd" />
							<path d="M0,92 L-11,5 L0,0 L11,5 Z" fill="#c94b33" />
							<circle r="8" fill="url(#compass-gold)" />
							<circle r="3.2" fill="#241a10" />
						</g>
					</g>

					<!-- 顶部标记 -->
					<path
						d="M400,6 L408,21 L392,21 Z"
						fill="url(#compass-gold)"
						stroke="#5c4717"
						stroke-width="1"
					/>
				</svg>

				{#each sparks as s (s.angle)}
					<span
						class="compass-spark"
						style={`--orbit-angle: ${s.angle}deg; --orbit-duration: ${s.duration}s; --orbit-delay: ${s.delay}s;`}
					></span>
				{/each}
			</div>
			<p class="compass-text">幽幽子正在推演天机…</p>
			<p class="compass-sub">天机不可泄露 · 请静候片刻</p>
		</div>
	</div>
{/if}

<style>
	.ai-box {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px dashed var(--line-divider);
		border-radius: var(--radius-medium);
		background: transparent;
	}

	.ai-box__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.ai-box__title {
		font-weight: 600;
		color: var(--deep-text);
	}

	.ai-box__badge {
		padding: 0.05rem 0.4rem;
		border-radius: var(--radius-small);
		background: var(--btn-regular-bg-hover);
		color: var(--content-meta);
		font-size: 0.7rem;
		letter-spacing: 0.05em;
	}

	.ai-box__question {
		display: flex;
		gap: 0.5rem;
	}

	.ai-box__question input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-medium);
		background: transparent;
		color: var(--deep-text);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.ai-box__question-text {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-medium);
		background: var(--btn-regular-bg-hover);
		color: var(--deep-text);
		font-size: 0.9rem;
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ai-box__question input:focus {
		border-color: var(--deep-text);
	}

	.ai-box__question input:disabled {
		opacity: 0.6;
	}

	.ai-box__button {
		flex-shrink: 0;
		padding: 0.5rem 1.1rem;
		border: 1px solid var(--deep-text);
		border-radius: var(--radius-medium);
		background: transparent;
		color: var(--deep-text);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.ai-box__button:hover:not(:disabled) {
		background: var(--deep-text);
		color: var(--page-bg);
	}

	.ai-box__button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ai-box__error {
		margin-top: 0.75rem;
		color: var(--article-pinned-accent);
		font-size: 0.85rem;
	}

	.ai-box__hint {
		margin-top: 0.75rem;
		color: var(--content-meta);
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.ai-box__result {
		margin-top: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-left: 2px solid var(--deep-text);
		background: var(--btn-regular-bg-hover);
		color: var(--deep-text);
		font-size: 0.9rem;
		line-height: 1.8;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.ai-box__fallback-note {
		margin-top: 0.75rem;
		color: var(--content-meta);
		font-size: 0.85rem;
		line-height: 1.6;
	}

	.ai-box__result--prompt {
		max-height: 20rem;
		overflow-y: auto;
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.ai-box__copy-btn {
		margin-top: 0.6rem;
		padding: 0.4rem 1rem;
		border: none;
		border-radius: 0.5rem;
		background: var(--btn-regular-bg);
		color: var(--deep-text);
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.ai-box__copy-btn:hover {
		background: var(--btn-regular-bg-hover);
	}

	/* ── 风水罗盘 loading 覆盖层 ──────────────────── */
	.compass-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(6, 8, 12, 0.62);
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
	}

	.compass-scene {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		animation: compass-pop 0.65s cubic-bezier(0.34, 1.45, 0.5, 1) both;
	}

	@keyframes compass-pop {
		0% {
			opacity: 0;
			transform: scale(0.25) rotate(-140deg);
			filter: blur(12px);
		}
		55% {
			opacity: 1;
			transform: scale(1.12) rotate(8deg);
			filter: blur(0);
		}
		78% {
			transform: scale(0.96) rotate(-4deg);
		}
		100% {
			transform: scale(1) rotate(0deg);
		}
	}

	.compass {
		position: relative;
		width: 264px;
		height: 264px;
		display: grid;
		place-items: center;
		filter: drop-shadow(0 0 24px rgba(255, 215, 74, 0.35));
	}

	.compass::before {
		content: "";
		position: absolute;
		inset: 6px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(242, 207, 122, 0.2) 0%,
			rgba(242, 207, 122, 0.05) 45%,
			transparent 70%
		);
		animation: compass-glow 2.2s ease-in-out infinite alternate;
	}

	@keyframes compass-glow {
		from {
			opacity: 0.55;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1.04);
		}
	}

	/* 入场扩散光环 */
	.compass::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px solid rgba(255, 215, 74, 0.55);
		animation: ring-out 1s ease-out 0.2s both;
	}

	@keyframes ring-out {
		from {
			transform: scale(0.5);
			opacity: 0.8;
		}
		to {
			transform: scale(1.7);
			opacity: 0;
		}
	}

	.compass-svg {
		width: 264px;
		height: 264px;
	}

	/* ── 罗盘环配色 ────────────────────────────── */
	.ring-gold {
		fill: url(#compass-gold);
	}

	.ring-gold-dim {
		fill: #d3ab5f;
		opacity: 0.9;
	}

	.ring-jade {
		fill: url(#compass-jade);
	}

	.ring-rose {
		fill: #e3a06d;
	}

	.trigram-line {
		stroke: #e8b85c;
		stroke-width: 5;
		stroke-linecap: round;
	}

	.tick-minor {
		stroke: #6b5a33;
		stroke-width: 5;
		opacity: 0.5;
	}

	.tick-major {
		stroke: url(#compass-gold);
		stroke-width: 10;
		opacity: 0.9;
	}

	.divider {
		stroke: #453619;
		stroke-width: 1;
		opacity: 0.55;
	}

	.orbit {
		fill: none;
		stroke: rgba(217, 171, 82, 0.35);
	}

	.dish-line {
		stroke: rgba(217, 171, 82, 0.28);
		stroke-width: 1;
	}

	/* ── 多环异速旋转 ──────────────────────────── */
	.compass-ring {
		transform-box: view-box;
		transform-origin: 400px 400px;
	}

	.compass-ring--r24 {
		animation: compass-spin 51.4s linear infinite;
	}

	.compass-ring--rbr {
		animation: compass-spin-rev 32.7s linear infinite;
	}

	.compass-ring--rtr {
		animation: compass-spin 18.9s linear infinite;
	}

	.compass-ring--rst {
		animation: compass-spin-rev 12.4s linear infinite;
	}

	.orbit-anim {
		animation: compass-spin 38s linear infinite;
		transform-box: fill-box;
		transform-origin: center;
	}

	.orbit-anim.rev {
		animation-direction: reverse;
		animation-duration: 52s;
	}

	.compass-breath {
		animation: compass-glow 4.5s ease-in-out infinite;
	}

	/* 指针微摆 */
	.compass-needle {
		animation: needle-sway 2.4s ease-in-out infinite alternate;
	}

	@keyframes needle-sway {
		from {
			transform: rotate(-7deg);
		}
		to {
			transform: rotate(7deg);
		}
	}

	@keyframes compass-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes compass-spin-rev {
		to {
			transform: rotate(-360deg);
		}
	}

	.compass-spark {
		--orbit-angle: 0deg;
		--orbit-duration: 3s;
		--orbit-delay: 0s;
		position: absolute;
		left: 50%;
		top: 50%;
		width: 6px;
		height: 6px;
		margin: -3px 0 0 -3px;
		border-radius: 50%;
		background: #ffd94a;
		box-shadow: 0 0 10px 2px rgba(255, 217, 74, 0.65);
		animation: spark-orbit var(--orbit-duration) linear infinite;
		animation-delay: var(--orbit-delay);
	}

	@keyframes spark-orbit {
		from {
			transform: rotate(var(--orbit-angle)) translateX(132px) scale(1);
			opacity: 0.9;
		}
		50% {
			opacity: 0.45;
		}
		to {
			transform: rotate(calc(var(--orbit-angle) + 360deg)) translateX(132px)
				scale(0.8);
			opacity: 0.9;
		}
	}

	.compass-text {
		margin: 0;
		color: #ffe9a8;
		font-size: 1.05rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-shadow: 0 0 14px rgba(255, 215, 74, 0.5);
		animation: text-rise 0.5s ease 0.28s both;
	}

	.compass-sub {
		margin: 0;
		color: rgba(255, 233, 168, 0.65);
		font-size: 0.8rem;
		letter-spacing: 0.2em;
		animation: text-rise 0.5s ease 0.4s both;
	}

	@keyframes text-rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.compass-ring,
		.orbit-anim,
		.compass-breath,
		.compass-needle,
		.compass-spark {
			animation: none;
		}
		.compass-scene {
			animation-duration: 0.01s;
		}
	}
</style>
