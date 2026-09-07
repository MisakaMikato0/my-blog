# Knowledge Graph Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the legacy tag relationship graph with the upstream four-tier knowledge graph while preserving the current project’s unrelated customizations.

**Architecture:** Port only the approved upstream feature commit 349027dbee9414ec6574d9b75682e4957e309f74. Astro content code builds and caches KGData at the server boundary, the JSON endpoint serves it with HTTP caching, and the categories page server-renders small metadata plus an accessible fallback before the client mounts the canvas graph.

**Tech Stack:** Astro 7, TypeScript, Vitest, D3 7, Stylus/CSS, Astro content collections.

## Global Constraints

- Work exclusively on branch codex/knowledge-graph-integration; never merge upstream history or modify master.
- Use commit 349027dbee9414ec6574d9b75682e4957e309f74 as the only upstream feature source.
- Completely replace TagGraph: no source reference may remain to TagGraph, tag-graph-controller, tag-graph-data, or getTagGraphData.
- Preserve current non-graph layout, content, and configuration when resolving modified upstream files.
- Obtain heading slugs only with Astro render(entry); do not recreate anchors from raw Markdown.
- Do not add dependencies: d3 7.9.0 is already installed.
- For each production change, write and run the focused failing test first, then make the smallest passing implementation.
- Final acceptance requires successful pnpm test, pnpm type-check, pnpm check, and pnpm build.

---

## File Structure

| File | Responsibility |
| --- | --- |
| src/utils/knowledge-graph-data.ts | Pure conversion from normalized post data to four-tier KGData. |
| src/utils/knowledge-graph-data.test.ts | Regression coverage for node tiers, links, heading filtering, and metadata. |
| src/utils/content-utils.ts | Content collection/render boundary and post-heading cache. |
| src/pages/api/knowledge-graph.json.ts | Cacheable KGData JSON endpoint. |
| src/utils/graph/*.ts | Canvas geometry, scene, simulation, rendering, playback, interaction types. |
| src/components/widget/KnowledgeGraph.astro | Client request, lifecycle, canvas host, and detail interaction. |
| src/components/widget/GraphFilterPanel.astro | Server-rendered controls based on KGMeta. |
| src/pages/categories.astro | Categories graph entry point and SEO/read-screen fallback. |
| src/knowledge-graph-*.contract.test.ts | Static contracts for server and page integration boundaries. |
| src/styles/widgets/*.css | Canvas, filter-panel, and detail-panel styles. |

## Task 1: Add the pure data builder and regression tests

**Files:**
- Create: src/utils/knowledge-graph-data.test.ts
- Create: src/utils/knowledge-graph-data.ts

**Interfaces:**
- Produces buildKnowledgeGraphData(posts, options): KGData.
- Graph node IDs are c:<category>, t:<tag>, p:<post-id>, and h:<post-id>#<heading-slug>.
- Exported builder signature:

~~~ts
export function buildKnowledgeGraphData(
  posts: KGInputPost[],
  options: BuildKnowledgeGraphOptions,
): KGData;
~~~

- [ ] **Step 1: Create the failing test at src/utils/knowledge-graph-data.test.ts.**

~~~ts
import { describe, expect, it } from "vitest";
import { buildKnowledgeGraphData } from "@/utils/knowledge-graph-data";

const options = {
  uncategorizedName: "Uncategorized",
  categoryUrl: (name: string) => "/categories/" + name + "/",
  tagUrl: (name: string) => "/tags/" + name + "/",
  siteStartDate: "2020-01-01T00:00:00.000Z",
};

describe("buildKnowledgeGraphData", () => {
  it("builds four tiers, normalizes tags, and keeps rendered heading slugs", () => {
    const graph = buildKnowledgeGraphData([
      {
        id: "first", title: "First", url: "/posts/first/",
        published: "2024-01-02T00:00:00.000Z", category: "Guides",
        tags: ["Astro", " Astro ", ""],
        headings: [
          { depth: 1, slug: "first", text: "First" },
          { depth: 2, slug: "install-1", text: "Install" },
          { depth: 3, slug: "ignored", text: "Ignored" },
        ],
      },
      {
        id: "second", title: "Second", url: "/posts/second/",
        published: "2024-02-03T00:00:00.000Z", category: undefined,
        tags: ["Astro", "CSS"], headings: [],
      },
    ], options);

    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      "c:Guides", "c:Uncategorized", "t:Astro", "t:CSS",
      "p:first", "p:second", "h:first#install-1",
    ]));
    expect(graph.nodes.find((node) => node.id === "h:first#install-1")).toMatchObject({
      tier: "heading", url: "/posts/first/#install-1", postId: "first", depth: 2,
    });
    expect(graph.nodes.some((node) => node.id.endsWith("#ignored"))).toBe(false);
    expect(graph.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "c:Guides", target: "t:Astro", kind: "category-tag" }),
      expect.objectContaining({ source: "t:Astro", target: "p:first", kind: "tag-post" }),
      expect.objectContaining({ source: "p:first", target: "h:first#install-1", kind: "post-heading" }),
      expect.objectContaining({ source: "t:Astro", target: "t:CSS", kind: "tag-tag", value: 1 }),
    ]));
    expect(graph.meta).toMatchObject({
      version: 1, headingDepth: 2,
      counts: { category: 2, tag: 2, post: 2, heading: 1 },
      timeRange: { from: Date.parse("2020-01-01T00:00:00.000Z"), to: Date.parse("2024-02-03T00:00:00.000Z") },
    });
  });

  it("links an untagged post directly to its category", () => {
    const graph = buildKnowledgeGraphData([{
      id: "untagged", title: "Untagged", url: "/posts/untagged/",
      published: "2024-03-01T00:00:00.000Z", category: "Notes", tags: [], headings: [],
    }], options);
    expect(graph.links).toContainEqual({
      source: "c:Notes", target: "p:untagged", kind: "category-post", value: 1,
    });
  });
});
~~~

- [ ] **Step 2: Verify the test is red.**

Run: pnpm vitest run src/utils/knowledge-graph-data.test.ts

Expected: module resolution fails because src/utils/knowledge-graph-data.ts does not yet exist.

- [ ] **Step 3: Add the upstream pure builder without Astro runtime imports.**

~~~powershell
git show 349027dbee9414ec6574d9b75682e4957e309f74:src/utils/knowledge-graph-data.ts | Set-Content -Encoding utf8 src/utils/knowledge-graph-data.ts
git grep -n 'from "astro' -- src/utils/knowledge-graph-data.ts
~~~

Expected from grep: no output. Preserve target types GraphTier, KGLinkKind, KGInputPost, KGNode, KGLink, KGMeta, KGData, and BuildKnowledgeGraphOptions.

- [ ] **Step 4: Verify green.**

Run: pnpm vitest run src/utils/knowledge-graph-data.test.ts

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit.**

~~~powershell
git add src/utils/knowledge-graph-data.ts src/utils/knowledge-graph-data.test.ts
git commit -m "feat: add knowledge graph data builder"
~~~

## Task 2: Add rendered-heading extraction and the JSON API

**Files:**
- Modify: src/utils/content-utils.ts
- Create: src/pages/api/knowledge-graph.json.ts
- Create: src/knowledge-graph-data-pipeline.contract.test.ts

**Interfaces:**
- Produces getAllPostHeadings(): Promise<Map<string, MarkdownHeading[]>>.
- Produces getKnowledgeGraphData(): Promise<KGData>.
- GET() returns JSON with Content-Type application/json; charset=utf-8 and Cache-Control public, max-age=3600, stale-while-revalidate=86400.

- [ ] **Step 1: Write the failing pipeline contract.**

~~~ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(process.cwd() + "/" + file, "utf8");

describe("knowledge graph data pipeline", () => {
  it("renders posts for canonical heading slugs and exposes KGData", () => {
    const source = read("src/utils/content-utils.ts");
    expect(source).toContain('import { type CollectionEntry, getCollection, render } from "astro:content";');
    expect(source).toContain("export async function getAllPostHeadings");
    expect(source).toContain("export async function getKnowledgeGraphData(): Promise<KGData>");
    expect(source).not.toContain("getTagGraphData");
  });

  it("serves the graph through a cacheable JSON endpoint", () => {
    const source = read("src/pages/api/knowledge-graph.json.ts");
    expect(source).toContain("getKnowledgeGraphData");
    expect(source).toContain('"Content-Type": "application/json; charset=utf-8"');
    expect(source).toContain('"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"');
  });
});
~~~

- [ ] **Step 2: Verify red.**

Run: pnpm vitest run src/knowledge-graph-data-pipeline.contract.test.ts

Expected: FAIL because the endpoint does not exist and content-utils still uses getTagGraphData.

- [ ] **Step 3: Replace only the legacy graph adapter in content-utils.ts.**

Add render to the Astro content import, import MarkdownHeading, siteConfig, buildKnowledgeGraphData, and KGData. Add the following declarations and do not alter existing list/category helper behavior:

~~~ts
let cachedHeadings: Map<string, MarkdownHeading[]> | null = null;

export async function getAllPostHeadings(): Promise<Map<string, MarkdownHeading[]>>;
export async function getKnowledgeGraphData(): Promise<KGData>;
~~~

getAllPostHeadings must serially call render(post), map headings by post.id, and retain the map in cachedHeadings. getKnowledgeGraphData must map each current post to id, title, getPostUrlBySlug(post.id), published, category, tags, and the rendered heading depth/slug/text. Invoke the Task 1 builder with i18n(I18nKey.uncategorized), getCategoryUrl, getTagUrl, and siteConfig.siteStartDate.

- [ ] **Step 4: Add the endpoint exactly from the target commit.**

~~~powershell
git show 349027dbee9414ec6574d9b75682e4957e309f74:src/pages/api/knowledge-graph.json.ts | Set-Content -Encoding utf8 src/pages/api/knowledge-graph.json.ts
~~~

- [ ] **Step 5: Verify green.**

Run: pnpm vitest run src/knowledge-graph-data-pipeline.contract.test.ts src/utils/knowledge-graph-data.test.ts

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit.**

~~~powershell
git add src/utils/content-utils.ts src/pages/api/knowledge-graph.json.ts src/knowledge-graph-data-pipeline.contract.test.ts
git commit -m "feat: expose knowledge graph data API"
~~~

## Task 3: Port the graph engine and UI shell

**Files:**
- Create: src/utils/graph/geometry.ts
- Create: src/utils/graph/types.ts
- Create: src/utils/graph/scene.ts
- Create: src/utils/graph/simulation.ts
- Create: src/utils/graph/playback.ts
- Create: src/utils/graph/renderer.ts
- Create: src/utils/graph/index.ts
- Create: src/components/widget/GraphFilterPanel.astro
- Create: src/components/widget/KnowledgeGraph.astro
- Create: src/utils/graph/geometry.test.ts

**Interfaces:**
- mountKnowledgeGraph(root: HTMLElement, data: KGData, strings: GraphStrings): GraphController is the only canvas bootstrap API.
- GraphController.destroy(): void must release listeners, observers, timers, and animation frames.
- KnowledgeGraph.astro requests /api/knowledge-graph.json and cleans the active controller before each Astro page remount.

- [ ] **Step 1: Write the failing geometry test.**

~~~ts
import { describe, expect, it } from "vitest";
import { clamp, easeOutBack, easeOutCubic } from "@/utils/graph/geometry";

describe("graph geometry", () => {
  it("clamps values to inclusive bounds", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(11, 0, 10)).toBe(10);
  });
  it("keeps easing endpoints stable", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutBack(0)).toBe(0);
    expect(easeOutBack(1)).toBe(1);
  });
});
~~~

- [ ] **Step 2: Verify red.**

Run: pnpm vitest run src/utils/graph/geometry.test.ts

Expected: module resolution fails because the graph module does not exist.

- [ ] **Step 3: Copy the isolated engine and UI files exactly from the approved commit.**

~~~powershell
git checkout 349027dbee9414ec6574d9b75682e4957e309f74 -- src/utils/graph/geometry.ts src/utils/graph/types.ts src/utils/graph/scene.ts src/utils/graph/simulation.ts src/utils/graph/playback.ts src/utils/graph/renderer.ts src/utils/graph/index.ts src/components/widget/GraphFilterPanel.astro src/components/widget/KnowledgeGraph.astro
~~~

Confirm index.ts imports navigation helpers through current aliases and KnowledgeGraph.astro fetches the relative API URL, not a hard-coded domain.

- [ ] **Step 4: Verify green.**

Run: pnpm vitest run src/utils/graph/geometry.test.ts src/utils/knowledge-graph-data.test.ts

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit.**

~~~powershell
git add src/utils/graph src/components/widget/GraphFilterPanel.astro src/components/widget/KnowledgeGraph.astro
git commit -m "feat: add interactive knowledge graph"
~~~

## Task 4: Replace the categories page and migrate styles, menu, and i18n

**Files:**
- Modify: src/pages/categories.astro
- Modify: src/styles/pages/categories.css
- Create: src/styles/widgets/knowledge-graph.css
- Create: src/styles/widgets/graph-filter-panel.css
- Create: src/styles/widgets/graph-detail-panel.css
- Modify: src/styles/variables.styl
- Modify: src/config/navBarConfig.ts
- Modify: src/constants/link-presets.ts
- Modify: src/i18n/i18nKey.ts and all five language files
- Create: src/knowledge-graph-page.contract.test.ts

**Interfaces:**
- categories.astro imports KnowledgeGraph, invokes getKnowledgeGraphData, and passes only meta to the component.
- It prefetches /api/knowledge-graph.json, returns noindex,follow for query URLs, and has an sr-only category/tag fallback.
- Every language defines every kg key from kgDetailTitle through kgLoaded.

- [ ] **Step 1: Write the failing replacement contract.**

~~~ts
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
~~~

- [ ] **Step 2: Verify red.**

Run: pnpm vitest run src/knowledge-graph-page.contract.test.ts

Expected: FAIL because categories.astro imports TagGraph and the three legacy files exist.

- [ ] **Step 3: Migrate page and styles.**

~~~powershell
git checkout 349027dbee9414ec6574d9b75682e4957e309f74 -- src/styles/widgets/knowledge-graph.css src/styles/widgets/graph-filter-panel.css src/styles/widgets/graph-detail-panel.css
~~~

Replace only the graph part of categories.astro with the target implementation: import the three styles, load getKnowledgeGraphData().meta and getTagList(), prefetch the endpoint, include an sr-only H1 plus category/tag fallback nav, and render KnowledgeGraph. Remove CategoryExplorer, getCategoryTagGroups, and all TagGraph setup from this page. In categories.css remove all .tag-graph and .tag-graph__ rules, retain only rules selected by replacement markup, and port the target graph-page layout rules.

- [ ] **Step 4: Migrate config and language copy without overwriting unrelated current values.**

Use these exact semantic changes:

~~~ts
// src/config/navBarConfig.ts
children: [LinkPreset.PostList, LinkPreset.Archive, LinkPreset.Categories],

// src/constants/link-presets.ts
[LinkPreset.Categories]: { name: "图谱", url: "/categories/", icon: "material-symbols:hub-outline" },
~~~

Add --graph-chip-checked: oklch(0.55 0.12 190) to the light variables block and --graph-chip-checked: oklch(0.75 0.12 190) to the dark block. Add all 21 kg keys from kgDetailTitle through kgLoaded to I18nKey and every language using target-commit translations. Remove tagGraphSectionTitle only after its last reference is gone. Apply the upstream postList label change in each language.

- [ ] **Step 5: Delete the old graph implementation.**

~~~powershell
git rm src/components/widget/TagGraph.astro src/utils/tag-graph-controller.ts src/utils/tag-graph-data.ts
git grep -n -E 'TagGraph|tag-graph-controller|tag-graph-data|getTagGraphData' -- src
~~~

Expected from grep: no output. Remove stale comments and selectors rather than suppressing the check.

- [ ] **Step 6: Verify green.**

Run: pnpm vitest run src/knowledge-graph-page.contract.test.ts src/knowledge-graph-data-pipeline.contract.test.ts src/utils/knowledge-graph-data.test.ts src/utils/graph/geometry.test.ts

Expected: PASS, 9 tests.

- [ ] **Step 7: Commit.**

~~~powershell
git add src/pages/categories.astro src/styles src/config/navBarConfig.ts src/constants/link-presets.ts src/i18n src/components/widget/TagGraph.astro src/utils/tag-graph-controller.ts src/utils/tag-graph-data.ts src/knowledge-graph-page.contract.test.ts
git commit -m "feat: replace tag graph with knowledge graph"
~~~

## Task 5: Complete full verification and prepare the branch for review

**Files:**
- No intended production edits.
- If validation exposes a reproducible defect, first add or extend the focused test, then implement its minimal fix and rerun the affected suite.

- [ ] **Step 1: Confirm there are no Git conflicts or conflict markers.**

~~~powershell
git diff --check
git diff --name-only --diff-filter=U
git grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -- ':!pnpm-lock.yaml'
~~~

Expected: no output and exit code 0 from all commands.

- [ ] **Step 2: Run the complete unit suite.**

Run: pnpm test

Expected: exit 0, including all four new knowledge-graph tests.

- [ ] **Step 3: Run type and Astro validation.**

~~~powershell
pnpm type-check
pnpm check
~~~

Expected: both exit 0 with no diagnostics classified as errors.

- [ ] **Step 4: Run the production build.**

Run: pnpm build

Expected: exit 0 and Pagefind completes after Astro build.

- [ ] **Step 5: Smoke-test the development page.**

Run: pnpm dev --host 127.0.0.1

At /categories/, verify preparation changes to loaded, category/tag/post tiers appear, heading tier initially remains disabled, search and category chips update the node stats, reset view works, post/heading selection navigates to its URL/anchor, and reduced-motion mode does not continuously animate.

- [ ] **Step 6: Collect review evidence without merging master.**

~~~powershell
git status --short
git log --oneline master..HEAD
~~~

Expected: only the design, plan, and intentional knowledge-graph commits appear. Do not push or merge master during this task.
