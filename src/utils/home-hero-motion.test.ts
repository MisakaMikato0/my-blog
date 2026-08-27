import { describe, expect, it } from "vitest";
import {
	createHeroTileLayout,
	getHeroPinEndDistance,
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
