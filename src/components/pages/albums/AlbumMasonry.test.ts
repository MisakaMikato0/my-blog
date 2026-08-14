import { render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AlbumMasonry from "./AlbumMasonry.svelte";
import type { AlbumPhotoItem } from "./types";

class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	elements: Element[] = [];

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
		MockIntersectionObserver.instances.push(this);
	}

	observe(element: Element) {
		this.elements.push(element);
	}

	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}

	/** 模拟哨兵进入视口 */
	trigger() {
		if (this.elements.length === 0) return;
		this.callback(
			[
				{
					isIntersecting: true,
					target: this.elements[0],
				} as IntersectionObserverEntry,
			],
			this as unknown as IntersectionObserver,
		);
	}
}

function makePhotos(count: number, albumId = "travel"): AlbumPhotoItem[] {
	return Array.from({ length: count }, (_, i) => ({
		src: `/gallery/${albumId}/${i}.jpg`,
		albumId,
	}));
}

function stubFetchEmpty() {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(new Response(JSON.stringify({ albums: [] }))),
	);
}

describe("AlbumMasonry", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		MockIntersectionObserver.instances = [];
	});

	it("首屏只渲染 pageSize 张，哨兵触发后增量加载", async () => {
		stubFetchEmpty();
		const photos = makePhotos(100);

		render(AlbumMasonry, {
			photos,
			pageSize: 48,
			emptyLabel: "empty",
			loadingLabel: "loading",
		});
		await tick();

		const masonry = document.querySelector("[data-albums-masonry]");
		expect(masonry?.children.length).toBe(48);

		MockIntersectionObserver.instances.forEach((o) => o.trigger());
		await Promise.resolve();
		expect(masonry?.children.length).toBe(96);

		MockIntersectionObserver.instances.forEach((o) => o.trigger());
		await Promise.resolve();
		expect(masonry?.children.length).toBe(100);
	});

	it("无照片且索引为空时展示空态文案", async () => {
		stubFetchEmpty();

		render(AlbumMasonry, {
			photos: [],
			emptyLabel: "暂无照片",
			loadingLabel: "加载中…",
		});
		await tick();

		await waitFor(() => {
			expect(screen.getByText("暂无照片")).toBeTruthy();
		});
	});

	it("全部视图合并动态相册照片（dynamic 相册）", async () => {
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
								photos: [
									{ path: "/gallery/space/1.jpg" },
									{ path: "/gallery/space/2.jpg" },
								],
							},
							{
								id: "travel",
								name: "旅游",
								dynamic: false,
								photos: [{ path: "/gallery/travel/x.jpg" }],
							},
						],
					}),
				),
			),
		);

		render(AlbumMasonry, {
			photos: [],
			emptyLabel: "empty",
			loadingLabel: "loading",
		});
		await tick();

		await waitFor(() => {
			const masonry = document.querySelector("[data-albums-masonry]");
			expect(masonry?.children.length).toBe(2);
		});
	});

	it("单相册视图仅合并该相册的索引照片，索引内部重复去重", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						cdnBase: "https://cdn.example.com",
						albums: [
							{
								id: "travel",
								name: "旅游",
								photos: [
									{ path: "/gallery/travel/101.jpg" },
									{ path: "/gallery/travel/101.jpg" }, // 索引内部重复
									{ path: "/gallery/travel/101.jpg" },
									{ path: "/gallery/travel/102.jpg" },
								],
							},
						],
					}),
				),
			),
		);

		render(AlbumMasonry, {
			photos: makePhotos(1),
			albumId: "travel",
			emptyLabel: "empty",
			loadingLabel: "loading",
		});
		await tick();

		await waitFor(() => {
			const masonry = document.querySelector("[data-albums-masonry]");
			// 静态 1 张 + 索引新增 2 张（101/102，重复项去重）
			expect(masonry?.children.length).toBe(3);
		});
	});
});
