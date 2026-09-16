import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tocStylesPath = resolve(
	process.cwd(),
	"src/styles/components/article-toc-panel.css",
);

describe("article TOC panel layout", () => {
	it("anchors to the current page width instead of a stale hard-coded offset", async () => {
		const css = await readFile(tocStylesPath, "utf8");

		expect(css).toContain(
			"left: calc(50% + (var(--page-width) / 2) + var(--space-4));",
		);
		expect(css).not.toContain("28.25rem");
	});

	it("only shows the fixed panel when the viewport can fit the page and panel side by side", async () => {
		const css = await readFile(tocStylesPath, "utf8");

		expect(css).toContain(
			"@media (min-width: 104rem) and (hover: hover) and (pointer: fine)",
		);
	});
});
