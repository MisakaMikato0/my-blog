import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

async function readSource(path: string): Promise<string> {
	return readFile(resolve(sourceRoot, path), "utf8");
}

describe("knowledge graph data pipeline contract", () => {
	it("uses Astro-rendered headings and exports the knowledge graph adapter", async () => {
		const source = await readSource("utils/content-utils.ts");

		expect(source).toMatch(
			/import\s*{[^}]*\btype\s+CollectionEntry\b[^}]*\bgetCollection\b[^}]*\brender\b[^}]*}\s*from\s*["']astro:content["']/s,
		);
		expect(source).toMatch(
			/export\s+async\s+function\s+getAllPostHeadings\s*\(/,
		);
		expect(source).toMatch(
			/export\s+async\s+function\s+getKnowledgeGraphData\s*\(/,
		);
		expect(source).not.toContain("getTagGraphData");
	});

	it("serves knowledge graph JSON with the required cache policy", async () => {
		const source = await readSource("pages/api/knowledge-graph.json.ts");

		expect(source).toMatch(
			/import\s*{\s*getKnowledgeGraphData\s*}\s*from\s*["']@\/utils\/content-utils["']/,
		);
		expect(source).toMatch(/await\s+getKnowledgeGraphData\s*\(\s*\)/);
		expect(source).toContain(
			'"Content-Type": "application/json; charset=utf-8"',
		);
		expect(source).toContain(
			'"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"',
		);
	});
});
