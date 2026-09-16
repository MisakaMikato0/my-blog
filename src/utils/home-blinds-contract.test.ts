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

describe("HomeBlinds postcard migration contract", () => {
	it("uses one raised postcard layout without legacy caption variants", async () => {
		const scene = await fs.promises.readFile(
			path.resolve("src/components/layout/HomeBlindsScene.astro"),
			"utf8",
		);

		expect(scene).toContain("home-blinds-scene--raised");
		expect(scene).toContain("home-blinds-scene__card");
		expect(scene).toContain("home-blinds-scene__string");
		expect(scene).not.toContain("data-scene-variant");
		expect(scene).not.toContain("CAPTION_VARIANTS");
		expect(scene).not.toContain("data-scene-decor");
	});

	it("keeps the controller independent from removed scene variants", async () => {
		const controller = await fs.promises.readFile(
			path.resolve("src/utils/home-blinds-controller.ts"),
			"utf8",
		);

		expect(controller).not.toContain("CAPTION_MOTION");
		expect(controller).not.toContain("data-scene-variant");
		expect(controller).not.toContain("data-scene-decor");
		expect(controller).not.toContain("data-scenes-portal-edge");
	});

	it("declares postcard dates in the typed scene configuration", async () => {
		const types = await fs.promises.readFile(
			path.resolve("src/types/config.ts"),
			"utf8",
		);
		const config = await fs.promises.readFile(
			path.resolve("src/config/homeConfig.ts"),
			"utf8",
		);

		expect(types).toContain("date?: string");
		expect(config).toContain('date: "');
	});
});
