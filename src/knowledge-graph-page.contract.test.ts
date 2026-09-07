import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(process.cwd() + "/" + file, "utf8");

describe("knowledge graph page replacement", () => {
  it("uses KnowledgeGraph and removes the legacy page entry", () => {
    const page = read("src/pages/categories.astro");
    expect(page).toContain('import KnowledgeGraph from "@components/widget/KnowledgeGraph.astro";');
    expect(page).toContain("const { meta } = await getKnowledgeGraphData();");
    expect(page).toContain("<KnowledgeGraph meta={meta} />");
    expect(page).toContain('href={url("/api/knowledge-graph.json")}');
    expect(page).not.toContain("TagGraph");
  });

  it("defines panel translations in every language", () => {
    for (const language of ["en", "ja", "ru", "zh_CN", "zh_TW"]) {
      const source = read("src/i18n/languages/" + language + ".ts");
      expect(source).toContain("[Key.kgPanelTitle]");
      expect(source).toContain("[Key.kgLoaded]");
    }
  });

  it("does not retain legacy graph source files", () => {
    expect(existsSync(process.cwd() + "/src/components/widget/TagGraph.astro")).toBe(false);
    expect(existsSync(process.cwd() + "/src/utils/tag-graph-controller.ts")).toBe(false);
    expect(existsSync(process.cwd() + "/src/utils/tag-graph-data.ts")).toBe(false);
  });
});
