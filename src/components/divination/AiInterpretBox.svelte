<script lang="ts">
import { fade } from "svelte/transition";
import type { DivinationData } from "mingyu-core/divination";
import type { DivinationMethodId } from "mingyu-core/divination/config";

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
let errorText = $state("");

// ── 罗盘 loading 数据 ──────────────────────────────
const CX = 110;
const CY = 110;

function polar(radius: number, deg: number) {
	const rad = (deg * Math.PI) / 180;
	return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

// 外圈刻度：每 5° 一个，每 15° 主刻度加长加粗
const ticks = Array.from({ length: 72 }, (_, i) => {
	const deg = i * 5;
	const major = i % 3 === 0;
	const inner = polar(major ? 82 : 88, deg);
	const outer = polar(97, deg);
	return { x: inner.x, y: inner.y, x2: outer.x, y2: outer.y, major };
});

// 八卦环
const trigrams = [
	{ char: "☰", deg: 0 },
	{ char: "☱", deg: 45 },
	{ char: "☲", deg: 90 },
	{ char: "☳", deg: 135 },
	{ char: "☴", deg: 180 },
	{ char: "☵", deg: 225 },
	{ char: "☶", deg: 270 },
	{ char: "☷", deg: 315 },
].map((t) => ({ ...t, ...polar(75, t.deg) }));

// 四正方位
const marks = [
	{ char: "南", deg: 0 },
	{ char: "东", deg: 90 },
	{ char: "北", deg: 180 },
	{ char: "西", deg: 270 },
].map((m) => ({ ...m, ...polar(58, m.deg) }));

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
			error?: string;
		};
		if (!response.ok || !payload.text) {
			if (payload.error === "AI_KEY_NOT_CONFIGURED") {
				throw new Error(
					"站长尚未配置 AI 解卦 API Key，请联系管理员启用此功能。",
				);
			}
			throw new Error(payload.error ?? `请求失败（${response.status}）`);
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
		<div class="ai-box__result">{resultText}</div>
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
					viewBox="0 0 220 220"
					width="232"
					height="232"
				>
					<defs>
						<radialGradient id="compass-glow" cx="50%" cy="50%" r="50%">
							<stop offset="0%" stop-color="rgba(255,215,74,0.30)" />
							<stop offset="60%" stop-color="rgba(255,215,74,0.08)" />
							<stop offset="100%" stop-color="rgba(255,215,74,0)" />
						</radialGradient>
						<linearGradient id="compass-gold" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stop-color="#f6e27a" />
							<stop offset="50%" stop-color="#c9a227" />
							<stop offset="100%" stop-color="#f6e27a" />
						</linearGradient>
						<linearGradient id="needle-red" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#ff7b6b" />
							<stop offset="100%" stop-color="#c0392b" />
						</linearGradient>
					</defs>

					<circle cx="110" cy="110" r="106" fill="url(#compass-glow)" />
					<circle
						cx="110"
						cy="110"
						r="100"
						fill="rgba(8,10,14,0.72)"
						stroke="url(#compass-gold)"
						stroke-width="2.5"
					/>
					<circle
						cx="110"
						cy="110"
						r="96.5"
						fill="none"
						stroke="rgba(246,226,122,0.25)"
						stroke-width="1"
					/>

					{#each ticks as t (t.x + "-" + t.y)}
						<line
							x1={t.x}
							y1={t.y}
							x2={t.x2}
							y2={t.y2}
							stroke="url(#compass-gold)"
							stroke-width={t.major ? 2 : 0.8}
							opacity={t.major ? 1 : 0.55}
						/>
					{/each}

					<g class="compass-pan">
						<circle
							cx="110"
							cy="110"
							r="79"
							fill="none"
							stroke="url(#compass-gold)"
							stroke-width="1.4"
							opacity="0.85"
						/>
						<circle
							cx="110"
							cy="110"
							r="52"
							fill="none"
							stroke="rgba(246,226,122,0.35)"
							stroke-width="1"
							stroke-dasharray="3 5"
						/>
						{#each trigrams as tg (tg.char)}
							<text
								x={tg.x}
								y={tg.y + 6}
								text-anchor="middle"
								font-size="15"
								fill="#e8d48b"
							>{tg.char}</text>
						{/each}
						{#each marks as mk (mk.char)}
							<text
								x={mk.x}
								y={mk.y + 5}
								text-anchor="middle"
								font-size="11"
								fill="#c9a227"
								opacity="0.9"
							>{mk.char}</text>
						{/each}
					</g>

					<polygon
						points="110,38 116,108 110,114 104,108"
						fill="url(#needle-red)"
					/>
					<polygon
						points="110,114 116,108 110,182 104,108"
						fill="rgba(233,236,239,0.85)"
					/>
					<circle
						cx="110"
						cy="110"
						r="6"
						fill="#f6e27a"
						stroke="#7a5c10"
						stroke-width="1"
					/>

					<g class="compass-taiji">
						<circle cx="110" cy="110" r="15" fill="#fff" />
						<path
							d="M110 95 A15 15 0 0 0 110 125 A7.5 7.5 0 0 1 110 110 A7.5 7.5 0 0 1 110 95 Z"
							fill="#1a1a1a"
						/>
						<circle cx="110" cy="103.5" r="2.3" fill="#1a1a1a" />
						<circle cx="110" cy="116.5" r="2.3" fill="#fff" />
					</g>
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

	/* ── 罗盘 loading 覆盖层 ─────────────────────── */
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
			rgba(255, 215, 74, 0.22) 0%,
			rgba(255, 215, 74, 0.06) 45%,
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
		width: 232px;
		height: 232px;
	}

	.compass-pan,
	.compass-taiji {
		transform-origin: 110px 110px;
	}

	.compass-pan {
		animation: compass-spin 18s linear infinite;
	}

	.compass-taiji {
		animation: compass-spin-rev 9s linear infinite;
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
		.compass-pan,
		.compass-taiji,
		.compass-spark {
			animation: none;
		}
		.compass-scene {
			animation-duration: 0.01s;
		}
	}
</style>
