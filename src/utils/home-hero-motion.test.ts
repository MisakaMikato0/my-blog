import { describe, expect, it } from "vitest";
import {
	createHeroTileLayout,
	getHeroMosaicAspectRatio,
	getHeroPinEndDistance,
	getHeroTextFadeTargets,
	HERO_INTERACTION_HOLD_START,
} from "@/utils/home-hero-motion";

describe("createHeroTileLayout", () => {
	it("creates the upstream 4×6 mosaic tile set with a deterministic reveal order", () => {
		const tiles = createHeroTileLayout({
			rows: 4,
			columns: 6,
			idleVisible: 6,
			seed: 20260814,
		});

		expect(tiles).toHaveLength(24);
		expect(new Set(tiles.map((tile) => tile.order)).size).toBe(24);
		expect(tiles.filter((tile) => tile.initiallyVisible)).toHaveLength(6);
	});
});

describe("getHeroPinEndDistance", () => {
	it("uses the larger configured distance or minimum viewport distance", () => {
		expect(getHeroPinEndDistance(500, 800, 2)).toBe(1600);
		expect(getHeroPinEndDistance(2000, 800, 2)).toBe(2000);
	});

	it("never returns a negative or non-finite distance", () => {
		expect(getHeroPinEndDistance(-500, 800, 0)).toBe(0);
		expect(getHeroPinEndDistance(Number.NaN, 800, 2)).toBe(1600);
		expect(getHeroPinEndDistance(500, Number.POSITIVE_INFINITY, 2)).toBe(500);
		expect(getHeroPinEndDistance(500, 800, Number.NaN)).toBe(500);
	});
});

describe("getHeroMosaicAspectRatio", () => {
	it("keeps the source image ratio and falls back for invalid values", () => {
		expect(getHeroMosaicAspectRatio(827 / 472)).toBeCloseTo(827 / 472);
		expect(getHeroMosaicAspectRatio(Number.NaN)).toBe(2);
		expect(getHeroMosaicAspectRatio(0)).toBe(2);
	});
});

describe("getHeroTextFadeTargets", () => {
	it("fades contact text without hiding the signature before its rain entrance", () => {
		const contact = { id: "contact" };
		const signature = { id: "signature" };

		expect(getHeroTextFadeTargets(contact, signature)).toEqual([contact]);
	});
});

describe("HERO_INTERACTION_HOLD_START", () => {
	it("starts shortly after the mosaic has completed", () => {
		expect(HERO_INTERACTION_HOLD_START).toBeGreaterThan(0.99);
		expect(HERO_INTERACTION_HOLD_START).toBeLessThan(1.3);
	});
});
