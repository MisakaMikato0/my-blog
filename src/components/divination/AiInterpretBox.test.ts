import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiuyaoReading } from "@/utils/divination";
import AiInterpretBox from "./AiInterpretBox.svelte";

const FIXED_DATE = new Date("2026-08-20T13:30:00+08:00");

describe("AiInterpretBox 组件", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("渲染标题、输入框与解卦按钮", () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		render(AiInterpretBox, { props: { method: "liuyao", data: liuyao.data } });
		expect(screen.getByText(/解卦（偷偷发给幽幽子）/)).toBeTruthy();
		expect(screen.getByPlaceholderText(/所问何事/)).toBeTruthy();
		expect(screen.getByRole("button", { name: "解卦" })).toBeTruthy();
	});

	it("点击解卦后调用后端并展示结果", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ text: "此卦宜守不宜进……" }), {
				status: 200,
			}),
		);
		render(AiInterpretBox, { props: { method: "liuyao", data: liuyao.data } });

		await fireEvent.click(screen.getByRole("button", { name: "解卦" }));
		expect(await screen.findByText(/此卦宜守不宜进/)).toBeTruthy();

		// 验证请求体
		const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		expect(url).toBe("/api/divination/interpret");
		const body = JSON.parse(String(init.body)) as { method: string };
		expect(body.method).toBe("liuyao");
	});

	it("携带问题输入发送请求", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ text: "分析如下" }), { status: 200 }),
		);
		render(AiInterpretBox, { props: { method: "liuyao", data: liuyao.data } });

		const input = screen.getByPlaceholderText(/所问何事/);
		await fireEvent.input(input, { target: { value: "最近换工作合适吗" } });
		await fireEvent.click(screen.getByRole("button", { name: "解卦" }));
		await screen.findByText(/分析如下/);

		const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(String(init.body)) as { question: string };
		expect(body.question).toBe("最近换工作合适吗");
	});

	it("解卦期间显示罗盘 loading 覆盖层，结束后消失", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		let resolveFetch: (value: Response) => void;
		vi.mocked(fetch).mockReturnValue(
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
		);
		const { container } = render(AiInterpretBox, {
			props: { method: "liuyao", data: liuyao.data },
		});

		await fireEvent.click(screen.getByRole("button", { name: "解卦" }));

		// 请求未返回时，罗盘覆盖层可见
		expect(container.querySelector(".compass-overlay")).toBeTruthy();
		expect(container.querySelector(".compass-ring")).toBeTruthy();
		expect(container.querySelector(".trigram-line")).toBeTruthy();
		expect(screen.getByText(/幽幽子正在推演天机/)).toBeTruthy();

		// 请求返回后，覆盖层消失
		resolveFetch!(
			new Response(JSON.stringify({ text: "卦象已明" }), { status: 200 }),
		);
		await screen.findByText(/卦象已明/);
		await vi.waitFor(() =>
			expect(container.querySelector(".compass-overlay")).toBeNull(),
		);
	});

	it("起卦前已定所问时只读展示所问，不再显示输入框", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ text: "结合所问分析如下" }), {
				status: 200,
			}),
		);
		render(AiInterpretBox, {
			props: {
				method: "liuyao",
				data: liuyao.data,
				question: "这段感情该如何经营",
			},
		});

		// 已定所问 → 只读展示，不再出现可编辑输入框
		expect(screen.queryByPlaceholderText(/所问何事/)).toBeNull();
		expect(screen.getByText(/所问：这段感情该如何经营/)).toBeTruthy();

		// 解卦仍携带起卦前所定问题
		await fireEvent.click(screen.getByRole("button", { name: "解卦" }));
		await screen.findByText(/结合所问分析如下/);
		const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(String(init.body)) as { question: string };
		expect(body.question).toBe("这段感情该如何经营");
	});

	it("后端未配置 Key 时展示友好提示", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ error: "AI_KEY_NOT_CONFIGURED" }), {
				status: 503,
			}),
		);
		render(AiInterpretBox, { props: { method: "liuyao", data: liuyao.data } });

		await fireEvent.click(screen.getByRole("button", { name: "解卦" }));
		expect(
			await screen.findByText(/站长尚未配置 AI 解卦 API Key/),
		).toBeTruthy();
	});

	it("网络失败时展示错误信息", async () => {
		const liuyao = createLiuyaoReading({ customDate: FIXED_DATE });
		// 真实浏览器网络失败抛 TypeError（"Failed to fetch"）
		vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
		render(AiInterpretBox, { props: { method: "liuyao", data: liuyao.data } });

		await fireEvent.click(screen.getByRole("button", { name: "解卦" }));
		expect(await screen.findByText(/网络异常/)).toBeTruthy();
	});
});
