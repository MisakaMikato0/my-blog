import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiuyaoReading, createMeihuaReading } from "@/utils/divination";
import { handleDivinationInterpret } from "./handler";

const FIXED_DATE = new Date("2026-08-20T13:30:00+08:00");

function buildEnv(overrides: Partial<Env> = {}): Env {
	return {
		AI: {} as Ai,
		VECTORIZE: {} as VectorizeIndex,
		ASSETS: {} as Fetcher,
		...overrides,
	} as Env;
}

function jsonRequest(body: unknown): Request {
	return new Request("https://example.com/api/divination/interpret", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("handleDivinationInterpret", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("方法不允许时返回 405", async () => {
		const response = await handleDivinationInterpret(
			new Request("https://example.com/api/divination/interpret"),
			buildEnv({ DEEPSEEK_API_KEY: "test" }),
		);
		expect(response.status).toBe(405);
	});

	it("未配置 API Key 时返回 503", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		const response = await handleDivinationInterpret(
			jsonRequest({ method: "liuyao", data: liuyao.data }),
			buildEnv({}),
		);
		expect(response.status).toBe(503);
		const payload = (await response.json()) as { error: string };
		expect(payload.error).toBe("AI_KEY_NOT_CONFIGURED");
	});

	it("非法 method 返回 400", async () => {
		const response = await handleDivinationInterpret(
			jsonRequest({ method: "hack", data: {} }),
			buildEnv({ DEEPSEEK_API_KEY: "test" }),
		);
		expect(response.status).toBe(400);
	});

	it("成功调用：用 buildDivinationPrompt 生成提示词并返回 AI 文本", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					choices: [{ message: { content: "此卦主守成，不宜冒进……" } }],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const response = await handleDivinationInterpret(
			jsonRequest({
				method: "liuyao",
				data: liuyao.data,
				question: "近期事业运势如何？",
			}),
			buildEnv({ DEEPSEEK_API_KEY: "test-key" }),
		);
		expect(response.status).toBe(200);
		const payload = (await response.json()) as { text: string };
		expect(payload.text).toContain("守成");

		// 验证上游请求构造
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("/chat/completions");
		const headers = init.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer test-key");
		const body = JSON.parse(String(init.body)) as {
			model: string;
			messages: Array<{ role: string; content: string }>;
		};
		expect(body.model).toBe("deepseek-ai/DeepSeek-V4-Flash");
		// 提示词包含排盘信息与问题
		const userContent = body.messages.at(-1)?.content ?? "";
		expect(userContent).toContain("风泽中孚");
		expect(userContent).toContain("近期事业运势如何？");
	});

	it("可回退到 AI_API_KEY 与自定义 DeepSeek 配置", async () => {
		const meihua = createMeihuaReading({ customDate: FIXED_DATE });
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					choices: [{ message: { content: "解卦结果" } }],
				}),
				{ status: 200 },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		await handleDivinationInterpret(
			jsonRequest({ method: "meihua", data: meihua.data }),
			buildEnv({
				AI_API_KEY: "modelscope-key",
				DEEPSEEK_API_URL: "https://api.deepseek.com/v1",
				DEEPSEEK_CHAT_MODEL: "deepseek-chat",
			}),
		);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
		const headers = init.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer modelscope-key");
		const body = JSON.parse(String(init.body)) as { model: string };
		expect(body.model).toBe("deepseek-chat");
	});

	it("上游失败时返回 500 与诊断信息", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })),
		);
		const response = await handleDivinationInterpret(
			jsonRequest({ method: "liuyao", data: liuyao.data }),
			buildEnv({ DEEPSEEK_API_KEY: "test-key" }),
		);
		expect(response.status).toBe(500);
		const payload = (await response.json()) as { error: string };
		expect(payload.error).toContain("UPSTREAM_429");
	});

	it("请求体过大返回 413", async () => {
		const bigBody = JSON.stringify({
			method: "liuyao",
			data: { x: "a".repeat(70 * 1024) },
		});
		const response = await handleDivinationInterpret(
			jsonRequest(bigBody),
			buildEnv({ DEEPSEEK_API_KEY: "test-key" }),
		);
		expect(response.status).toBe(413);
	});
});
