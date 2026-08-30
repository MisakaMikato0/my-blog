import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sitemap Wiki entry", () => {
	it("adds the static Wiki index without hardcoding a different site origin", () => {
		const configPath = `${process.cwd()}/astro.config.mjs`;
		const config = readFileSync(configPath, "utf8");

		expect(config).toContain("customPages:");
		expect(config).toContain(
			'new URL("/wiki/index.json", siteConfig.site_url).toString()',
		);
	});
});
