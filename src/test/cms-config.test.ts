import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Decap posts collection layout", () => {
	it("uses the flat-file layout used by src/content/posts/{category}/{slug}.md", () => {
		const configPath = path.resolve("public/admin/config.yml");
		const config = fs.readFileSync(configPath, "utf8");

		expect(config).toContain(
			"nested:\n      depth: 2\n      subfolders: false",
		);
		expect(config).toContain(
			"path:\n        widget: string\n        label: 路径",
		);
		expect(config).not.toContain("widget: hidden");
		expect(config).not.toMatch(
			/path:\n {8}widget: string\n {8}label: 路径\n {8}default:/,
		);
	});
});
