import matter from "gray-matter";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/content-utils", () => ({
	getSortedPosts: vi.fn(),
}));

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
		const markdown = [
			"# 标题",
			"",
			"![封面](cover.png)",
			"",
			"[链接](https://example.com) 与 `inline code`",
			"",
			"```ts",
			"const hidden = true;",
			"```",
			"",
			"<div>HTML 文本</div>",
			"",
			"- 列表项",
			"1. 第二项",
		].join("\n");

		expect(stripMarkdown(markdown)).toBe(
			"标题 封面 链接 与 inline code HTML 文本 列表项 第二项",
		);
		expect(stripMarkdown(markdown)).not.toContain("const hidden = true;");
	});

	it("creates sections, stable heading ids, URLs, and character counts", () => {
		const article = toWikiArticle(
			post({}, "intro\n\n## Setup\n\n内容\n\n## Setup\n\n更多"),
			"https://example.com/",
		);

		expect(article.url).toBe("https://example.com/posts/notes/example/");
		expect(article.jsonUrl).toBe(
			"https://example.com/wiki/articles/notes/example.json",
		);
		expect(article.markdownUrl).toBe(
			"https://example.com/wiki/articles/notes/example.md",
		);
		expect(article.headings).toEqual(["Setup", "Setup"]);
		expect(article.sections.map(({ id }) => id)).toEqual([
			"example",
			"setup",
			"setup-1",
		]);
		expect(article.characterCount).toBe(23);
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
		expect(index.articles[0]).toMatchObject({
			id: "notes/example",
			title: "Example",
			description: "描述",
			published: "2026-01-02T00:00:00.000Z",
			updated: "2026-01-03T00:00:00.000Z",
			category: "技术",
			tags: ["Astro", "wiki"],
			url: "https://example.com/posts/notes/example/",
			jsonUrl: "https://example.com/wiki/articles/notes/example.json",
			markdownUrl: "https://example.com/wiki/articles/notes/example.md",
			headings: ["Intro"],
			excerpt: "描述",
			characterCount: 8,
		});
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
		expect(json.headers.get("Cache-Control")).toBe(
			"public, max-age=3600, stale-while-revalidate=86400",
		);
		const jsonBody = await json.json();
		expect(jsonBody).toMatchObject({
			id: "notes/example",
			description: "描述",
			published: "2026-01-02T00:00:00.000Z",
			tags: ["Astro", "wiki"],
			url: "https://example.com/posts/notes/example/",
			sections: [{ id: "intro", heading: "Intro", content: "正文" }],
			content: "# Intro\n\n正文",
		});
		expect(markdown.headers.get("Content-Type")).toBe(
			"text/markdown; charset=utf-8",
		);
		expect(markdown.headers.get("Cache-Control")).toBe(
			"public, max-age=3600, stale-while-revalidate=86400",
		);
		const markdownText = await markdown.text();
		const parsedMarkdown = matter(markdownText);
		expect(parsedMarkdown.data).toMatchObject({
			title: "Example",
			description: "描述",
			category: "技术",
			tags: ["Astro", "wiki"],
			canonical: "https://example.com/posts/notes/example/",
		});
		expect(new Date(parsedMarkdown.data.published).toISOString()).toBe(
			"2026-01-02T00:00:00.000Z",
		);
		expect(new Date(parsedMarkdown.data.updated).toISOString()).toBe(
			"2026-01-03T00:00:00.000Z",
		);
		expect(parsedMarkdown.content.trimEnd()).toBe("# Intro\n\n正文");
	});
});
