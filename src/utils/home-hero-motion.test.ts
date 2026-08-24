import { describe, expect, it } from "vitest";
import { getHeroMosaicCompletionTransform } from "@/utils/home-hero-motion";

describe("getHeroMosaicCompletionTransform", () => {
	it("keeps the assembled mosaic at its original size before the backdrop crossfade", () => {
		expect(getHeroMosaicCompletionTransform()).toEqual({ y: 0, scale: 1 });
	});
});
