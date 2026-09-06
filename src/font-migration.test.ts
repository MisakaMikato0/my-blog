import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("font migration", () => {
	it("uses Google Noto Sans SC for OG images instead of the removed local font", async () => {
		const fontConfig = await readFile("src/config/fontConfig.ts", "utf8");
		const ogSource = await readFile("src/pages/og/[...slug].png.ts", "utf8");
		const layout = await readFile("src/layouts/Layout.astro", "utf8");

		expect(fontConfig).not.toContain("AaZongYiYuan");
		expect(ogSource).toContain("googleFonts");
		expect(ogSource).toContain("Noto Sans SC");
		expect(ogSource).toContain("weight: [600, 700]");
		expect(layout).not.toContain("AaZongYiYuan");
	});
});
