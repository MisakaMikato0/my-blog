import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requireFromAstro = createRequire(require.resolve("astro"));
const yaml = requireFromAstro("js-yaml") as {
	load(source: string): { collections?: Array<Record<string, unknown>> };
};

describe("Decap posts collection layout", () => {
	it("keeps the legacy posts collection URL backed by one non-nested folder collection", () => {
		const configPath = path.resolve("public/admin/config.yml");
		const config = fs.readFileSync(configPath, "utf8");
		const parsed = yaml.load(config);

		expect(parsed.collections).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "posts",
					folder: "src/content/posts",
				}),
			]),
		);
		expect(config).not.toContain("nested:");
		expect(config).not.toMatch(/^ {4}meta:$/m);
		expect(config).toMatch(
			/- name: posts[\s\S]*?name: body\r?\n\s+widget: markdown/,
		);
	});
});
