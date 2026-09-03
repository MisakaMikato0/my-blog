import { describe, expect, it } from "vitest";

describe("home smooth scroll contract", () => {
	it("exports lifecycle functions", async () => {
		const module = await import("./home-smooth-scroll");
		expect(module.bootHomeSmoothScroll).toBeTypeOf("function");
		expect(module.teardownHomeSmoothScroll).toBeTypeOf("function");
	});
});
