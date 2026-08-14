import { render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlbumWheel from "./AlbumWheel.svelte";
import type { AlbumsWheelOption } from "./types";

const baseOptions: AlbumsWheelOption[] = [
	{ id: "all", name: "全部", cover: "/covers/all.jpg" },
	{ id: "travel", name: "旅游", cover: "/covers/travel.jpg", count: 12 },
];

describe("AlbumWheel", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("渲染全部选项，且默认选中第一项（全部）", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify({ albums: [] }))),
		);

		render(AlbumWheel, {
			options: baseOptions,
			viewLabel: "查看",
			hintLabel: "滚动或拖拽选择相册",
		});
		await tick();

		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(2);
		expect(options[0].getAttribute("aria-selected")).toBe("true");
		expect(options[1].getAttribute("aria-selected")).toBe("false");

		// 默认「全部」→ 查看按钮指向 /albums/all/
		expect(
			document.querySelector("[data-album-view]")?.getAttribute("href"),
		).toBe("/albums/all/");
	});

	it("点击选项后切换选中态与查看链接", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify({ albums: [] }))),
		);

		render(AlbumWheel, {
			options: baseOptions,
			viewLabel: "查看",
			hintLabel: "hint",
		});
		await tick();

		const options = screen.getAllByRole("option");
		options[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await tick();

		expect(options[1].getAttribute("aria-selected")).toBe("true");
		expect(options[0].getAttribute("aria-selected")).toBe("false");
		expect(
			document.querySelector("[data-album-view]")?.getAttribute("href"),
		).toBe("/albums/travel/");
		expect(
			document.querySelector("[data-album-selected-name]")?.textContent,
		).toBe("旅游");
	});

	it("索引接口返回动态相册时追加到轮盘尾部", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						cdnBase: "https://cdn.example.com",
						albums: [
							{
								id: "space",
								name: "星空",
								dynamic: true,
								cover: "/gallery/space/cover.jpg",
								photos: [{ path: "/gallery/space/1.jpg" }],
							},
						],
					}),
				),
			),
		);

		render(AlbumWheel, {
			options: baseOptions,
			viewLabel: "查看",
			hintLabel: "hint",
		});
		await tick();

		await waitFor(() => {
			expect(screen.getAllByRole("option")).toHaveLength(3);
		});
		expect(screen.getByText("星空")).toBeTruthy();
	});
});
