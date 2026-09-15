import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config";

const read = (file: string) => readFileSync(`${process.cwd()}/${file}`, "utf8");

describe("页面开关契约", () => {
	it("默认启用音乐、文章列表、归档、关于和知识图谱页面", () => {
		expect(siteConfig.pages).toMatchObject({
			music: true,
			postList: true,
			archive: true,
			about: true,
			categories: true,
		});
	});

	it.each([
		["about", "src/pages/about.astro"],
		["archive", "src/pages/archive.astro"],
		["categories", "src/pages/categories.astro"],
		["postList", "src/pages/list.astro"],
		["music", "src/pages/music.astro"],
	])("%s 页面关闭时重定向到 404", (page, file) => {
		const source = read(file);
		expect(source).toMatch(
			new RegExp(
				`!siteConfig\\.pages\\.${page}[^\\n]*\\n?[^\\n]*Astro\\.redirect\\(\"/404/\"\\)`,
			),
		);
	});

	it("知识图谱 API 在页面关闭时返回 404", () => {
		expect(read("src/pages/api/knowledge-graph.json.ts")).toMatch(
			/status:\s*404/,
		);
	});

	it("文章列表分页在关闭时返回空数组", () => {
		expect(read("src/pages/list/[page].astro")).toMatch(
			/if\s*\(!siteConfig\.pages\.postList\)\s*\{\s*return\s*\[\]/s,
		);
	});

	it("sitemap 过滤所有页面开关路径并保留 bangumi 过滤", () => {
		const config = read("astro.config.mjs");
		for (const pathname of [
			"/list/",
			"/music/",
			"/archive/",
			"/about/",
			"/categories/",
			"/collections/",
		]) {
			expect(config).toContain(`pathname === \"${pathname}\"`);
		}
		expect(config).toContain('pathname === "/bangumi/"');
	});
});
