import { describe, expect, it } from "vitest";
import {
	getHeroMosaicCompletionTransform,
	getHeroMosaicPhase,
	getHeroRainOpacity,
	getHeroPinEndDistance,
	getHeroTileDepth,
} from "@/utils/home-hero-motion";

describe("getHeroMosaicPhase", () => {
	it.each([
		[0, { phase: "flatten", localProgress: 0 }],
		[0.1, { phase: "assemble", localProgress: 0 }],
		[0.5, { phase: "hold", localProgress: 0 }],
		[0.65, { phase: "zoom", localProgress: 0 }],
		[0.9, { phase: "exit", localProgress: 0 }],
		[1, { phase: "exit", localProgress: 1 }],
	] as const)("returns the $phase phase and local progress", (progress, expected) => {
		expect(getHeroMosaicPhase(progress)).toEqual(expected);
	});

	it.each([
		[Number.POSITIVE_INFINITY, { phase: "exit", localProgress: 1 }],
		[Number.NEGATIVE_INFINITY, { phase: "flatten", localProgress: 0 }],
		[Number.NaN, { phase: "flatten", localProgress: 0 }],
	] as const)("normalizes non-finite progress", (progress, expected) => {
		expect(getHeroMosaicPhase(progress)).toEqual(expected);
	});

	it("clamps finite progress before calculating the phase", () => {
		expect(getHeroMosaicPhase(-1).localProgress).toBe(0);
		expect(getHeroMosaicPhase(2).localProgress).toBe(1);
	});
});

describe("getHeroRainOpacity", () => {
	it("keeps the rain visible before zoom and fades it out during zoom", () => {
		expect(getHeroRainOpacity(0.5)).toBe(1);
		expect(getHeroRainOpacity(0.65)).toBe(1);
		expect(getHeroRainOpacity(0.775)).toBe(0.5);
		expect(getHeroRainOpacity(0.9)).toBe(0);
		expect(getHeroRainOpacity(1)).toBe(0);
	});

	it("clamps invalid progress safely", () => {
		expect(getHeroRainOpacity(-1)).toBe(1);
		expect(getHeroRainOpacity(Number.NaN)).toBe(1);
		expect(getHeroRainOpacity(Number.POSITIVE_INFINITY)).toBe(0);
	});
});

describe("getHeroTileDepth", () => {
	it("maps normalized depth into deterministic 3D tile values", () => {
		expect(getHeroTileDepth(1, 24)).toEqual({
			z: 24,
			rotationX: 4,
			rotationY: -4,
			shadowOpacity: 0.34,
		});
	});

	it.each([
		[-1, 24],
		[Number.POSITIVE_INFINITY, 24],
		[Number.NEGATIVE_INFINITY, 24],
		[Number.NaN, 24],
	] as const)("normalizes negative and non-finite inputs", (depth, amplitude) => {
		expect(getHeroTileDepth(depth, amplitude)).toEqual({
			z: 0,
			rotationX: 0,
			rotationY: -0,
			shadowOpacity: 0,
		});
	});

	it.each([-24, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN] as const)(
		"normalizes invalid amplitude without changing depth values",
		(amplitude) => {
			expect(getHeroTileDepth(1, amplitude)).toEqual({
				z: 0,
				rotationX: 4,
				rotationY: -4,
				shadowOpacity: 0.34,
				});
		},
	);
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
