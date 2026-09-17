import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config";

const read = (file: string) => readFileSync(`${process.cwd()}/${file}`, "utf8");

describe("页面开关契约", () => {
	it("默认页面开关与当前页面模型一致", () => {
		expect(siteConfig.pages).toMatchObject({
			friends: true,
			sponsor: false,
			guestbook: false,
			gallery: true,
			collections: true,
			dynamic: true,
			bangumi: true,
			books: true,
			divination: true,
		});
	});

	it.each([
		["friends", "src/pages/friends.astro"],
		["sponsor", "src/pages/sponsor.astro"],
		["guestbook", "src/pages/guestbook.astro"],
		["gallery", "src/pages/gallery/index.astro"],
		["dynamic", "src/pages/dynamic/index.astro"],
		["bangumi", "src/pages/bangumi.astro"],
		["books", "src/pages/books.astro"],
		["divination", "src/pages/divination.astro"],
		["collections", "src/pages/collections.astro"],
	])("%s 页面关闭时重定向到 404", (page, file) => {
		const source = read(file);
		expect(source).toMatch(
			new RegExp(
				`!siteConfig\\.pages\\.${page}[^\\n]*\\n?[^\\n]*Astro\\.redirect\\("/404/"\\)`,
			),
		);
	});

	it("sitemap 过滤所有带页面开关的路径", () => {
		const config = read("astro.config.mjs");
		for (const pathname of [
			"/friends/",
			"/sponsor/",
			"/guestbook/",
			"/bangumi/",
			"/gallery/",
			"/dynamic/",
		]) {
			expect(config).toContain(`pathname === "${pathname}"`);
		}
	});
});
