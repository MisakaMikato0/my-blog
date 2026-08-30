import { describe, expect, it } from "vitest";
import {
	getHomeBlindsBackdropDisplay,
	getHomeBlindsBackdropVisibility,
	getHomeBlindsEmbeddedCompletionDistance,
	normalizeHomeBlindsRuntimeConfig,
} from "./home-blinds-controller";
import { getTimelineOffsetForScrollBoundary } from "./home-display-layer.js";

describe("HomeBlinds runtime config", () => {
	it("clamps scene and stand counts and applies runtime defaults", () => {
		expect(
			normalizeHomeBlindsRuntimeConfig({
				scenes: { sceneCount: 9, standCount: -1 },
			}),
		).toMatchObject({
			reveal: { foregroundOpacity: 0.5, pointerTravel: 28 },
			scenes: { sceneCount: 5, standCount: 0 },
		});
	});
});

describe("HomeBlinds scene transition", () => {
	it("does not complete an embedded scene before its entry offset plus pin distance", () => {
		expect(getHomeBlindsEmbeddedCompletionDistance(3400)).toBe(4250);
		expect(getHomeBlindsEmbeddedCompletionDistance(0)).toBe(2);
	});

	it("maps the HomeBlinds completion boundary into the outer timeline", () => {
		expect(getTimelineOffsetForScrollBoundary(4250, 7000, 8.9)).toBeCloseTo(
			13.7545,
			3,
		);
	});

	it("hides the original backdrop as soon as the portal takes over", () => {
		expect(getHomeBlindsBackdropVisibility("reveal", 0)).toBe(true);
		expect(getHomeBlindsBackdropVisibility("shrink", 0)).toBe(false);
		expect(getHomeBlindsBackdropVisibility("scenes", 0)).toBe(false);
		expect(getHomeBlindsBackdropVisibility("scenes", 0.2)).toBe(false);
		expect(getHomeBlindsBackdropVisibility("done", 1)).toBe(false);
		expect(getHomeBlindsBackdropDisplay("reveal", 0)).toBe("block");
		expect(getHomeBlindsBackdropDisplay("shrink", 0)).toBe("none");
		expect(getHomeBlindsBackdropDisplay("scenes", 0.2)).toBe("none");
		expect(getHomeBlindsBackdropDisplay("done", 1)).toBe("none");
	});
});
