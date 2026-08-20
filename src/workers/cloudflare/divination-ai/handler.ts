/**
 * AI 解卦端点（/api/divination/interpret）
 *
 * 职责：接收前端已算好的排盘数据，用 mingyu-core 官方提示词构建器
 * （buildDivinationPrompt）生成解卦提示词，调用 OpenAI 兼容的 Chat API
 * （默认 ModelScope / 可配 DeepSeek），返回白话解卦文本。
 * 安全设计：
 * - API Key 仅存于服务端环境变量（DEEPSEEK_API_KEY 或复用 AI_API_KEY），
 *   绝不下发到前端。
 * - method 白名单校验 + 请求体大小限制，防止滥用。
 * - 无 Key 时返回 503，前端友好提示。
 */

import type { DivinationData } from "mingyu-core/divination";
import { buildDivinationPrompt } from "mingyu-core/divination";
import type { DivinationMethodId } from "mingyu-core/divination/config";

// 塔罗大牌阵（凯尔特十字 10 张 / 年运 12 张）请求体可达 ~150KB，
// 故放宽到 512KB 以覆盖所有牌阵，同时保留防滥用上限。
const MAX_BODY_BYTES = 512 * 1024;
const MAX_QUESTION_CHARS = 200;
const REQUEST_TIMEOUT_MS = 30_000;

/** 支持 AI 解卦的方法（排除 random） */
type SupportedMethod = Exclude<DivinationMethodId, "random">;

const SUPPORTED_METHODS = new Set<SupportedMethod>([
	"liuyao",
	"meihua",
	"xiaoliuren",
	"jinkoujue",
	"qimen",
	"liuren",
	"tarot",
	"ssgw",
	"almanac",
	"lenormand",
	"astrolabe",
	"taiyi",
]);

type InterpretRequest = {
	method: SupportedMethod;
	data: DivinationData;
	question?: string;
};

function jsonResponse(payload: unknown, status: number): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

/** 从 Env 解析 AI 配置：优先 DEEPSEEK_*，回退 AI_API_KEY + aiSearchConfig */
function resolveAiConfig(env: Env) {
	const apiKey = env.DEEPSEEK_API_KEY ?? env.AI_API_KEY;
	const apiUrl =
		env.DEEPSEEK_API_URL ?? "https://api-inference.modelscope.cn/v1";
	const chatModel = env.DEEPSEEK_CHAT_MODEL ?? "Qwen/Qwen3.5-122B-A10B";
	return { apiKey, apiUrl, chatModel };
}

async function parseBody(request: Request): Promise<InterpretRequest> {
	const contentLength = Number(request.headers.get("Content-Length") ?? 0);
	if (contentLength > MAX_BODY_BYTES) {
		throw new Error("BODY_TOO_LARGE");
	}
	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		throw new Error("BODY_TOO_LARGE");
	}
	const body = JSON.parse(raw) as Partial<InterpretRequest>;
	if (!body.method || !SUPPORTED_METHODS.has(body.method)) {
		throw new Error("INVALID_METHOD");
	}
	if (!body.data) {
		throw new Error("MISSING_DATA");
	}
	const question =
		typeof body.question === "string" && body.question.trim()
			? body.question.trim().slice(0, MAX_QUESTION_CHARS)
			: undefined;
	return { method: body.method, data: body.data, question };
}

/** ModelScope 偶发返回空 choices，重试可显著提升成功率 */
const EMPTY_UPSTREAM_RESPONSE = "EMPTY_UPSTREAM_RESPONSE";
const MAX_CHAT_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

async function callChatApiOnce(
	apiUrl: string,
	apiKey: string,
	chatModel: string,
	prompt: string,
): Promise<string> {
	const endpoint = `${apiUrl.replace(/\/+$/, "")}/chat/completions`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: chatModel,
				messages: [
					{
						role: "system",
						content:
							"你是精通中国传统术数的解卦助手。请基于用户提供的排盘信息与所问之事，给出符合传统法理的白话解读。要求：1) 先概述卦象/盘面关键信息；2) 针对所问之事给出具体分析；3) 给出务实建议；4) 语言平实易懂，避免迷信恐吓；5) 全文控制在 500 字以内。",
					},
					{ role: "user", content: prompt },
				],
				temperature: 0.7,
				max_tokens: 1200,
				stream: false,
			}),
			signal: controller.signal,
		});
		if (!response.ok) {
			const snippet = (await response.text()).slice(0, 300);
			throw new Error(`UPSTREAM_${response.status}:${snippet}`);
		}
		const payload = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = payload.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error(EMPTY_UPSTREAM_RESPONSE);
		}
		return content.trim();
	} finally {
		clearTimeout(timer);
	}
}

async function callChatApi(
	apiUrl: string,
	apiKey: string,
	chatModel: string,
	prompt: string,
): Promise<string> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_CHAT_ATTEMPTS; attempt++) {
		try {
			return await callChatApiOnce(apiUrl, apiKey, chatModel, prompt);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			// 仅对空响应重试；其余错误（鉴权、限流、超时等）直接抛出
			if (
				message !== EMPTY_UPSTREAM_RESPONSE ||
				attempt === MAX_CHAT_ATTEMPTS
			) {
				throw error;
			}
			lastError = error;
			await new Promise((resolve) =>
				setTimeout(resolve, RETRY_DELAY_MS * attempt),
			);
		}
	}
	throw lastError;
}

export async function handleDivinationInterpret(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method !== "POST") {
		return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
	}
	const { apiKey, apiUrl, chatModel } = resolveAiConfig(env);
	if (!apiKey) {
		return jsonResponse({ error: "AI_KEY_NOT_CONFIGURED" }, 503);
	}

	let parsed: InterpretRequest;
	try {
		parsed = await parseBody(request);
	} catch (error) {
		const message = error instanceof Error ? error.message : "BAD_REQUEST";
		const status = message === "BODY_TOO_LARGE" ? 413 : 400;
		return jsonResponse({ error: message }, status);
	}

	try {
		const prompt = buildDivinationPrompt({
			method: parsed.method,
			data: parsed.data,
			question: parsed.question,
		});
		const text = await callChatApi(apiUrl, apiKey, chatModel, prompt);
		return jsonResponse({ text }, 200);
	} catch (error) {
		const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
		return jsonResponse({ error: message }, 500);
	}
}
