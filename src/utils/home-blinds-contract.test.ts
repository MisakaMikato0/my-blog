import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("HomeBlinds stage contract", () => {
	it("renders HomeBlinds before the standalone portfolio section", () => {
		const source = fs.readFileSync(
			path.resolve("src/pages/index.astro"),
			"utf8",
		);
		const blindsIndex = source.indexOf("<HomeBlinds />");
		const portfolioIndex = source.indexOf("<HomePortfolioShutter />");

		expect(blindsIndex).toBeGreaterThan(-1);
		expect(portfolioIndex).toBeGreaterThan(blindsIndex);
		expect(source).not.toContain("<HomeDisplayLayer />");
	});

	it("keeps portfolio markup out of the HomeBlinds component", () => {
		const source = fs.readFileSync(
			path.resolve("src/components/layout/HomeBlinds.astro"),
			"utf8",
		);

		expect(source).not.toContain("home-portfolio-shutter");
		expect(source).not.toContain("data-home-blinds-embedded");
	});

	it("keeps the embedded stage visible while the scenes viewport is active", () => {
		const source = fs.readFileSync(
			path.resolve("src/utils/home-blinds-controller.ts"),
			"utf8",
		);

		expect(source).toContain("const stageVisible = embedded");
		expect(source).toContain('? phase !== "done"');
		expect(source).toContain(': rootInView && phase !== "done";');
	});

	it("synchronizes horizontal mode when the scenes phase starts", () => {
		const source = fs.readFileSync(
			path.resolve("src/utils/home-blinds-controller.ts"),
			"utf8",
		);

		expect(source).toContain(
			'viewport.classList.toggle("is-horizontal", horizontalEnabled);',
		);
	});
});
