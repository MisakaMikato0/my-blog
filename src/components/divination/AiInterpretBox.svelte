<script lang="ts">
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
		<span class="ai-box__title">AI 解卦</span>
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
			{status === "loading" ? "解卦中…" : "解卦"}
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
			由 AI 基于传统法理生成白话解读，结果仅供参考，不构成决策建议。
		</p>
	{/if}
</div>

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
</style>
