import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(
		new URL(
			path.startsWith("src/") ? `./${path.slice(4)}` : `../${path}`,
			import.meta.url,
		),
		"utf8",
	);

describe("AI search removal", () => {
	it("keeps the ordinary Pagefind search flow wired", () => {
		const layout = readSource("src/layouts/Layout.astro");
		const modal = readSource("src/components/controls/SearchModal.svelte");
		const floatingDock = readSource("src/components/controls/FloatingDock.astro");
		const mobileDock = readSource("src/components/layout/MobileDock.astro");

		expect(layout).toContain("@/components/controls/SearchModal.svelte");
		expect(layout).toContain("SEARCH_MODAL_TOGGLE_EVENT");
		expect(layout).toContain("requestSearchModalToggle");
		expect(modal).toContain("window.pagefind.search(kw)");
		expect(modal).toContain("pagefindready");
		expect(floatingDock).not.toContain("dock-ai-search-btn");
		expect(mobileDock).toContain("mobile-dock-search-btn");
		expect(mobileDock).toContain("requestSearchModalToggle()");
	});

	it("removes AI search entry points, lazy loading, and shared symbols", () => {
		const files = [
			"src/components/controls/FloatingDock.astro",
			"src/components/layout/MobileDock.astro",
			"src/components/controls/SearchModal.svelte",
			"src/layouts/Layout.astro",
			"src/global.d.ts",
			"src/i18n/i18nKey.ts",
			"src/i18n/languages/en.ts",
			"src/i18n/languages/ja.ts",
			"src/i18n/languages/ru.ts",
			"src/i18n/languages/zh_CN.ts",
			"src/i18n/languages/zh_TW.ts",
			"src/constants/icons.ts",
			"src/config/index.ts",
			"astro.config.mjs",
		];
		const source = files.map(readSource).join("\n");

		for (const token of [
			"ai-search",
			"aiSearch",
			"toggle-ai-search",
			"__aiSearch",
			"aiSearchConfig",
			"ai-search-root",
			"vendor-ai",
		]) {
			expect(source).not.toContain(token);
		}

		expect(existsSync(new URL("./components/controls/ai-search", import.meta.url))).toBe(false);
		expect(existsSync(new URL("./styles/components/ai-search.css", import.meta.url))).toBe(false);
	});
});
