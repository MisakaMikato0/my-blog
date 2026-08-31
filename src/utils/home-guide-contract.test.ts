import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
	fs.readFileSync(path.resolve(relativePath), "utf8");

describe("home guide card structure and layout contracts", () => {
	it("keeps the complete upstream guide card structure", () => {
		const source = readSource("src/components/layout/HomeDataLayer.astro");

		for (const marker of [
			'data-guide-opening="pending"',
			"home-guide-grid",
			"guide-card--pinned",
			"guide-card--latest",
			"guide-card--categories",
			"guide-card--tags",
			"guide-card--contact",
			"data-guide-rotator",
			"data-tag-fan",
			"data-guide-contact-template",
			"guide-rotator__dots",
			"guide-link-list",
			"guide-tag-list",
		]) {
			expect(source, marker).toContain(marker);
		}
	});

	it("allows guide rows and tag motion to grow without clipping", () => {
		const source = readSource("src/styles/components/home-data-layer.css");

		expect(source).toContain(
			"grid-template-rows: repeat(2, minmax(var(--guide-row-height), auto));",
		);
		expect(source).toMatch(
			/\.guide-card--tags\s*\{[^}]*padding-bottom:\s*3rem;/,
		);
	});
});
