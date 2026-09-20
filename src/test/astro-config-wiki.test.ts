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

	it("keeps the Vite API proxy matcher valid as a regular expression", () => {
		const configPath = `${process.cwd()}/astro.config.mjs`;
		const config = readFileSync(configPath, "utf8");
		const proxyLine = config
			.split("\n")
			.find((line) => line.includes('"^/api/'));
		const proxyKey = proxyLine?.match(/"([^"]+)"\s*:\s*\{/u)?.[1];

		expect(proxyLine).toContain(String.raw`(?:$|\\?)`);
		expect(proxyKey).toBeDefined();
		expect(() => new RegExp(proxyKey ?? "")).not.toThrow();
	});
});
