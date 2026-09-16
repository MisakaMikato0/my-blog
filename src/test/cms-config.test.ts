import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requireFromAstro = createRequire(require.resolve("astro"));
const yaml = requireFromAstro("js-yaml") as { load(source: string): unknown };

describe("Decap posts collection layout", () => {
	it("uses a standard folder collection for each existing post directory", () => {
		const configPath = path.resolve("public/admin/config.yml");
		const config = fs.readFileSync(configPath, "utf8");

		expect(() => yaml.load(config)).not.toThrow();
		expect(config).not.toContain("nested:");
		expect(config).not.toMatch(/^ {4}meta:$/m);

		const expectedCollections = [
			["posts-ai", "src/content/posts/ai"],
			["posts-projects", "src/content/posts/projects"],
			["posts-others", "src/content/posts/others"],
			["posts-root", "src/content/posts"],
		];

		for (const [name, folder] of expectedCollections) {
			expect(config).toMatch(
				new RegExp(
					`- name: ${name}[\\s\\S]*?folder: ${folder}[\\s\\S]*?name: body\\r?\\n\\s+widget: markdown`,
				),
			);
		}
	});
});
