import { describe, expect, it, vi } from "vitest";

const publicPost = { id: "notes/example" };
const wikiIndex = { type: "BlogWikiIndex", articles: [] };
const wikiArticle = { id: "notes/example", content: "# Example" };

const getWikiPosts = vi.fn(async () => [publicPost]);
const createJsonResponse = vi.fn((value: unknown) =>
	new Response(JSON.stringify(value), {
		headers: { "Content-Type": "application/json" },
	}),
);
const createMarkdownResponse = vi.fn((value: unknown) =>
	new Response(String((value as { content: string }).content), {
		headers: { "Content-Type": "text/markdown" },
	}),
);
const createWikiIndex = vi.fn(() => wikiIndex);
const toWikiArticle = vi.fn(() => wikiArticle);

vi.mock("@/config", () => ({
	siteConfig: { site_url: "https://configured.example/" },
}));

vi.mock("@/utils/llm-wiki", () => ({
	createJsonResponse,
	createMarkdownResponse,
	createWikiIndex,
	getWikiPosts,
	toWikiArticle,
}));

describe("Wiki static routes", () => {
	it("prerenders the index and delegates public posts to the Wiki index converter", async () => {
		const route = await import("./index.json");

		expect(route.prerender).toBe(true);
		const response = await route.GET({ site: new URL("https://runtime.example/") } as never);

		expect(getWikiPosts).toHaveBeenCalled();
		expect(createWikiIndex).toHaveBeenCalledWith(
		[publicPost],
		new URL("https://runtime.example/"),
	);
		expect(createJsonResponse).toHaveBeenCalledWith(wikiIndex);
		expect(await response.json()).toEqual(wikiIndex);
	});

	it.each([
		["json", "./articles/[...slug].json", "application/json"],
		["markdown", "./articles/[...slug].md", "text/markdown"],
	] as const)(
		"prerenders the %s article route and preserves nested slugs in static paths",
		async (_name, modulePath, contentType) => {
			const route = await import(modulePath);

			expect(route.prerender).toBe(true);
			expect(await route.getStaticPaths?.()).toEqual([
				{ params: { slug: "notes/example" }, props: { post: publicPost } },
			]);

			const response = await route.GET({
				props: { post: publicPost },
				site: new URL("https://runtime.example/"),
			} as never);

			expect(toWikiArticle).toHaveBeenCalledWith(
				publicPost,
				new URL("https://runtime.example/"),
			);
			expect(response.headers.get("Content-Type")).toBe(contentType);
		},
	);
});
