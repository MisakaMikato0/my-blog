import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
	fs.readFileSync(path.resolve(relativePath), "utf8");

describe("Swup 4 lifecycle contracts", () => {
	it("does not register obsolete Swup 3 document events", () => {
		const files = [
			"src/components/common/VisitorCount.astro",
			"src/components/features/FloatingLyrics.astro",
			"src/components/layout/HomeDataLayer.astro",
			"src/components/layout/HomeMobile.astro",
			"src/components/widget/WeatherWidget.astro",
			"src/components/widget/TerrariumModel.astro",
			"src/components/widget/TagWordcloud.astro",
			"src/components/widget/TagBubble.astro",
		];

		for (const file of files) {
			const source = readSource(file);
			expect(source, file).not.toContain(
				'document.addEventListener("swup:contentReplaced"',
			);
			expect(source, file).not.toContain(
				'document.addEventListener("swup:willReplaceContent"',
			);
		}
	});

	it("cleans replaceable components before the DOM swap", () => {
		for (const file of [
			"src/components/layout/HomeDataLayer.astro",
			"src/components/layout/HomeMobile.astro",
			"src/components/widget/WeatherWidget.astro",
			"src/components/widget/TagWordcloud.astro",
			"src/components/widget/TagBubble.astro",
		]) {
			const source = readSource(file);
			expect(source, file).toContain(
				'document.addEventListener("astro:before-swap"',
			);
		}
	});

	it("tears down HomeBlinds before swap and boots after page load", () => {
		const source = readSource("src/components/layout/HomeBlinds.astro");
		expect(source).toContain("teardownHomeBlinds");
		expect(source).toContain(
			'document.addEventListener("astro:before-swap", teardownHomeBlinds)',
		);
		expect(source).toContain(
			'document.addEventListener("astro:page-load", boot)',
		);
	});
});
