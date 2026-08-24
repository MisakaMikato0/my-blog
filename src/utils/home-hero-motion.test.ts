import { describe, expect, it } from "vitest";
import { getHeroMosaicCompletionTransform } from "@/utils/home-hero-motion";

describe("getHeroMosaicCompletionTransform", () => {
	it("returns a cover transform for the gradual assembled-image zoom", () => {
		const transform = getHeroMosaicCompletionTransform({
			heroWidth: 1920,
			heroHeight: 1080,
			mosaicWidth: 1612.8,
			mosaicHeight: 806.4,
			mosaicTop: 241.6,
		});

		expect(transform.y).toBeCloseTo(-104.8, 5);
		expect(transform.scale).toBeCloseTo(1.34, 2);
	});
});
