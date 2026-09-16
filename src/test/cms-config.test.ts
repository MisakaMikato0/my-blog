import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requireFromAstro = createRequire(require.resolve("astro"));
const yaml = requireFromAstro("js-yaml") as {
	load(source: string): { collections?: Array<Record<string, unknown>> };
};

describe("Decap posts collection layout", () => {
	it("exposes every post directory as a CMS folder collection", () => {
		const configPath = path.resolve("public/admin/config.yml");
		const config = fs.readFileSync(configPath, "utf8");
		const parsed = yaml.load(config);
		const postCollections = (parsed.collections ?? []).filter((collection) =>
			String(collection.name).startsWith("posts"),
		);

		expect(postCollections).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "posts-ai",
					folder: "src/content/posts/ai",
				}),
				expect.objectContaining({
					name: "posts-projects",
					folder: "src/content/posts/projects",
				}),
				expect.objectContaining({
					name: "posts-others",
					folder: "src/content/posts/others",
				}),
				expect.objectContaining({
					name: "posts-root",
					folder: "src/content/posts",
				}),
			]),
		);
		expect(postCollections).toHaveLength(4);
		expect(config).toMatch(
			/- name: posts-ai[\s\S]*?name: body\r?\n\s+widget: markdown/,
		);
	});

	it("registers the article preview for every post collection", () => {
		const previewPath = path.resolve("public/admin/templates/preview.js");
		const preview = fs.readFileSync(previewPath, "utf8");
		const postCollectionNames = [
			"posts-ai",
			"posts-projects",
			"posts-others",
			"posts-root",
		];

		for (const collectionName of postCollectionNames) {
			expect(preview).toContain(
				"window.CMS.registerPreviewTemplate('" + collectionName + "', PostPreview)",
			);
		}
	});

	it("renders the markdown body through Decap's widget preview", () => {
		const previewPath = path.resolve("public/admin/templates/preview.js");
		const preview = fs.readFileSync(previewPath, "utf8");

		expect(preview).toContain("props.widgetFor('body')");
		expect(preview).not.toContain("entry.getIn(['data', 'body'])");
	});
});
