import { describe, expect, it } from "vitest";
import {
	createJsonResponse,
	createMarkdownResponse,
	createWikiIndex,
	isPublicWikiPost,
	stripMarkdown,
	toWikiArticle,
	type WikiPost,
} from "./llm-wiki";

const post = (
	overrides: Partial<WikiPost["data"]> = {},
	body = "# Intro\n\n正文",
) =>
	({
		id: "notes/example",
		body,
		data: {
			title: "Example",
			published: new Date("2026-01-02T00:00:00.000Z"),
			updated: new Date("2026-01-03T00:00:00.000Z"),
			description: "描述",
			tags: [" Astro ", "wiki"],
			category: "技术",
			draft: false,
			password: "",
			wikiExclude: false,
			prevTitle: "",
			prevSlug: "",
			nextTitle: "",
			nextSlug: "",
			...overrides,
		},
	}) as WikiPost;

describe("Wiki visibility", () => {
	it("excludes drafts, password-protected posts, and wikiExcluded posts", () => {
		expect(isPublicWikiPost(post())).toBe(true);
		expect(isPublicWikiPost(post({ draft: true }))).toBe(false);
		expect(isPublicWikiPost(post({ password: "secret" }))).toBe(false);
		expect(isPublicWikiPost(post({ wikiExclude: true }))).toBe(false);
	});
});

describe("Wiki conversion", () => {
	it("strips presentation-only Markdown and keeps semantic text", () => {
		expect(
			stripMarkdown(
				"# 标题\n\n[链接](https://example.com)\n\n[inline code]\n\n[code block]",
			),
		).toBe("标题 链接 inline code code block");
	});

	it("creates sections, stable heading ids, URLs, and character counts", () => {
		const article = toWikiArticle(
			post({}, "intro\n\n## Setup\n\n内容\n\n## Setup\n\n更多"),
			"https://example.com/",
		);

		expect(article.url).toBe("https://example.com/notes/example/");
		expect(article.jsonUrl).toBe(
			"https://example.com/wiki/articles/notes/example.json",
		);
		expect(article.markdownUrl).toBe(
			"https://example.com/wiki/articles/notes/example.md",
		);
		expect(article.headings).toEqual(["Setup", "Setup"]);
		expect(article.sections.map(({ id }) => id)).toEqual([
			"intro",
			"setup",
			"setup-1",
		]);
		expect(article.characterCount).toBeGreaterThan(0);
	});

	it("creates an index using only the supplied public posts", () => {
		const index = createWikiIndex(
			[post()],
			"https://example.com/",
			"2026-01-04T00:00:00.000Z",
		);

		expect(index).toMatchObject({
			type: "BlogWikiIndex",
			version: 1,
			site: "https://example.com/",
			generatedAt: "2026-01-04T00:00:00.000Z",
		});
		expect(index.articles).toHaveLength(1);
	});
});

describe("Wiki responses", () => {
	it("serializes JSON and Markdown with correct content types", async () => {
		const article = toWikiArticle(post(), "https://example.com/");
		const json = createJsonResponse(article);
		const markdown = createMarkdownResponse(article);

		expect(json.headers.get("Content-Type")).toBe(
			"application/json; charset=utf-8",
		);
		expect(await json.json()).toMatchObject({ id: "notes/example" });
		expect(markdown.headers.get("Content-Type")).toBe(
			"text/markdown; charset=utf-8",
		);
		const markdownText = await markdown.text();
		expect(markdownText).toContain('title: "Example"');
		expect(markdownText).toContain("# Intro");
	});
});
