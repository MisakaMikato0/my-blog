# Wiki 与 AI 搜索选择性迁移实施计划

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

Goal: 在当前分支新增静态 Wiki 机器入口，并完整移除 AI 搜索实现，同时保留其他 Cloudflare Worker 功能和普通 Pagefind 搜索。

Architecture: 复用现有 Astro content collection 和文章 URL 工具，在构建阶段把公开文章转换为 Wiki 索引、JSON 和 Markdown 静态输出。AI 搜索清理采用选择性移植：删除 AI 专属模块和引用，修改 functions/_worker.ts 移除 AI 路由，但保留非 AI Worker、functions/_worker.ts、wrangler.worker.jsonc 和 scripts/build-worker.mjs。

Tech Stack: Astro 7、TypeScript、Astro Content Collections、Vitest、Svelte、Cloudflare Pages Advanced Mode Worker、pnpm。

## Global Constraints

- 只移除 AI 搜索相关实现；必须保留 divination、dynamic、gallery 和 github-contributions Worker 功能。
- 必须保留普通 Pagefind 搜索入口和搜索逻辑。
- 不执行完整静态部署改造；不得删除 functions/_worker.ts、wrangler.worker.jsonc、scripts/build-worker.mjs 或非 AI Worker 依赖。
- Wiki 只暴露 draft !== true、无 password 且 wikiExclude !== true 的文章。
- Wiki 路由使用 export const prerender = true，不新增运行时 LLM 调用。
- 遵循 TDD：新增行为先写失败测试，再写最小实现。
- 每个任务完成独立测试后单独提交，避免把无关首页或部署改动带入迁移。

---

## 文件地图

| 文件 | 责任 |
| --- | --- |
| src/content.config.ts | 为文章 schema 增加可选的 wikiExclude 字段 |
| src/types/post.ts | 同步文章元数据 TypeScript 类型 |
| src/utils/llm-wiki.ts | Wiki 过滤、Markdown 摘要、章节解析、URL 和响应转换 |
| src/utils/llm-wiki.test.ts | Wiki 纯函数和序列化行为的单元测试 |
| src/pages/wiki/index.json.ts | Wiki 索引静态 API 路由 |
| src/pages/wiki/articles/[...slug].json.ts | 单篇 JSON 静态 API 路由 |
| src/pages/wiki/articles/[...slug].md.ts | 单篇 Markdown 静态 API 路由 |
| astro.config.mjs | 将 Wiki 索引加入 sitemap，移除 AI 专用 proxy/分包配置 |
| src/components/controls/FloatingDock.astro | 移除 AI 搜索入口，保留普通搜索和其他工具 |
| src/components/layout/MobileDock.astro | 移除 AI 搜索入口 |
| src/components/controls/SearchModal.svelte | 移除 AI 搜索切换/触发逻辑，保留 Pagefind |
| src/layouts/Layout.astro | 移除 AI 搜索根节点、动态加载和快捷键 wiring |
| src/global.d.ts | 删除 AI 搜索专属 Window 字段 |
| src/i18n/i18nKey.ts、src/i18n/languages/*.ts | 删除仅用于 AI 搜索的国际化键和值 |
| src/constants/icons.ts | 删除仅用于 AI 搜索的图标导出 |
| functions/_worker.ts | 删除 AI runtime import 和 /api/ai-chat，保留其他 Worker 路由 |
| src/worker.ts | 删除旧 AI/Worker 入口文件；先确认无其他引用 |
| src/components/controls/ai-search/ | 删除 AI 搜索前端模块 |
| src/server/ai-search/ | 删除 AI 搜索服务端模块 |
| src/workers/cloudflare/ai-search/ | 删除 AI 搜索 Worker 模块 |
| scripts/ai-search/ | 删除向量索引构建和 AI 搜索脚本 |
| src/config/aiSearchConfig.ts、src/types/ai-search.ts、src/styles/components/ai-search.css | 删除 AI 搜索配置、类型和样式 |
| scripts/post-loader.ts | 新增 IndexNow 使用的最小文章元数据加载器 |
| scripts/indexnow.ts | 改用 post-loader，继续过滤 draft/password |
| package.json、pnpm-lock.yaml、tsconfig.json | 删除 AI 专属脚本/引用；保留非 AI Worker 所需依赖 |

---

### Task 1: 为 Wiki 数据转换建立失败测试

Files:
- Create: src/utils/llm-wiki.test.ts
- Read: src/utils/llm-wiki.ts（实现前不存在，测试先定义目标接口）
- Read: src/types/post.ts
- Read: src/content.config.ts

Interfaces:
- Test fixtures use a minimal WikiPost shape with id, optional body, and data fields title, published, updated, description, tags, category, draft, password, wikiExclude.
- The implementation must export WikiPost, WikiSection, WikiArticleSummary, WikiArticle, WikiIndex, isPublicWikiPost, stripMarkdown, toWikiArticleSummary, toWikiArticle, createWikiIndex, createJsonResponse, and createMarkdownResponse.

- [ ] Step 1: Write the failing unit tests

Add tests for these exact behaviors:

    import { describe, expect, it } from "vitest";
    import {
      createJsonResponse,
      createMarkdownResponse,
      createWikiIndex,
      isPublicWikiPost,
      stripMarkdown,
      toWikiArticle,
      type WikiPost,
    } from "./llm-wiki";

    const post = (overrides: Partial<WikiPost["data"]> = {}, body = "# Intro\n\n正文") => ({
      id: "notes/example",
      body,
      data: {
        title: "Example",
        published: new Date("2026-01-02T00:00:00.000Z"),
        updated: new Date("2026-01-03T00:00:00.000Z"),
        description: "描述",
        tags: [" Astro ", "wiki"],
        category: "技术",
        draft: false,
        password: "",
        wikiExclude: false,
        prevTitle: "",
        prevSlug: "",
        nextTitle: "",
        nextSlug: "",
        ...overrides,
      },
    }) as WikiPost;

    describe("Wiki visibility", () => {
      it("excludes drafts, password-protected posts, and wikiExcluded posts", () => {
        expect(isPublicWikiPost(post())).toBe(true);
        expect(isPublicWikiPost(post({ draft: true }))).toBe(false);
        expect(isPublicWikiPost(post({ password: "secret" }))).toBe(false);
        expect(isPublicWikiPost(post({ wikiExclude: true }))).toBe(false);
      });
    });

    describe("Wiki conversion", () => {
      it("strips presentation-only Markdown and keeps semantic text", () => {
        expect(stripMarkdown("# 标题\n\n[链接](https://example.com)\n\n[inline code]\n\n[code block]")).toBe("标题 链接 inline code code block");
      });

      it("creates sections, stable heading ids, URLs, and character counts", () => {
        const article = toWikiArticle(post({}, "intro\n\n## Setup\n\n内容\n\n## Setup\n\n更多"), "https://example.com/");
        expect(article.url).toBe("https://example.com/notes/example/");
        expect(article.jsonUrl).toBe("https://example.com/wiki/articles/notes/example.json");
        expect(article.markdownUrl).toBe("https://example.com/wiki/articles/notes/example.md");
        expect(article.headings).toEqual(["Setup", "Setup"]);
        expect(article.sections.map(({ id }) => id)).toEqual(["intro", "setup", "setup-1"]);
        expect(article.characterCount).toBeGreaterThan(0);
      });

      it("creates an index using only the supplied public posts", () => {
        const index = createWikiIndex([post()], "https://example.com/", "2026-01-04T00:00:00.000Z");
        expect(index).toMatchObject({ type: "BlogWikiIndex", version: 1, site: "https://example.com/", generatedAt: "2026-01-04T00:00:00.000Z" });
        expect(index.articles).toHaveLength(1);
      });
    });

    describe("Wiki responses", () => {
      it("serializes JSON and Markdown with correct content types", async () => {
        const article = toWikiArticle(post(), "https://example.com/");
        const json = createJsonResponse(article);
        const markdown = createMarkdownResponse(article);
        expect(json.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
        expect(await json.json()).toMatchObject({ id: "notes/example" });
        expect(markdown.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
        const markdownText = await markdown.text();
        expect(markdownText).toContain("title: \"Example\"");
        expect(markdownText).toContain("# Intro");
      });
    });

The fixture may be adjusted to the actual Astro collection type if TypeScript rejects the direct cast; do not weaken assertions.

- [ ] Step 2: Run the focused test and verify it fails

Run:

    pnpm vitest run src/utils/llm-wiki.test.ts

Expected: FAIL because src/utils/llm-wiki.ts and its exported functions do not exist yet.

- [ ] Step 3: Commit the failing test

    git add src/utils/llm-wiki.test.ts
    git commit -m "test: define wiki conversion behavior"

---

### Task 2: Implement the Wiki data layer and article schema

Files:
- Create: src/utils/llm-wiki.ts
- Modify: src/content.config.ts
- Modify: src/types/post.ts
- Test: src/utils/llm-wiki.test.ts

Interfaces:
- WikiPost = CollectionEntry<"posts">.
- WikiSection = { id: string; level: number; heading: string; content: string; excerpt: string }.
- WikiArticleSummary contains id, title, description, published, optional updated, url, jsonUrl, markdownUrl, category, tags, headings, excerpt, and characterCount; date fields are ISO strings.
- WikiArticle = WikiArticleSummary plus content and sections.
- WikiIndex = { type: "BlogWikiIndex"; version: 1; site: string; generatedAt: string; articles: WikiArticleSummary[] }.
- isPublicWikiPost(post): boolean excludes draft === true, truthy password, and wikiExclude === true.
- getWikiPosts(): Promise<WikiPost[]> uses getSortedPosts() and filters through isPublicWikiPost.
- toWikiArticleSummary(post, site) and toWikiArticle(post, site) normalize site URLs and use getPostUrlBySlug(post.id).

- [ ] Step 1: Add wikiExclude to the content schema and TypeScript type

Add wikiExclude: z.boolean().optional().default(false) beside the existing visibility fields in src/content.config.ts, and add wikiExclude?: boolean to PostData in src/types/post.ts.

- [ ] Step 2: Implement pure Markdown helpers

Implement the heading regex, fenced-code tracking, stripMarkdown, truncation, and section generation. Use GithubSlugger so duplicate headings become setup and setup-1; ignore heading-looking lines inside fenced code blocks.

- [ ] Step 3: Implement article/index conversion and response helpers

Use the exact interfaces above. Encode nested slug path segments with encodeURIComponent, preserve / between segments, append .json/.md, and set:

    const WIKI_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

Markdown responses must include frontmatter for title, description, published, optional updated, category, tags, and canonical URL before the original article body.

- [ ] Step 4: Run focused tests and make them pass

Run:

    pnpm vitest run src/utils/llm-wiki.test.ts

Expected: PASS with no TypeScript or assertion failures.

- [ ] Step 5: Commit the Wiki data layer

    git add src/utils/llm-wiki.ts src/utils/llm-wiki.test.ts src/content.config.ts src/types/post.ts
    git commit -m "feat: add static llm wiki data layer"

---

### Task 3: Add prerendered Wiki routes and sitemap registration

Files:
- Create: src/pages/wiki/index.json.ts
- Create: src/pages/wiki/articles/[...slug].json.ts
- Create: src/pages/wiki/articles/[...slug].md.ts
- Modify: astro.config.mjs

Interfaces:
- GET on index.json.ts returns createJsonResponse(createWikiIndex(await getWikiPosts(), site ?? siteConfig.site_url)).
- Both article routes export getStaticPaths() returning params slug post.id and props post for every public Wiki post.
- Article JSON calls createJsonResponse(toWikiArticle(post, site ?? siteConfig.site_url)).
- Article Markdown calls createMarkdownResponse(toWikiArticle(post, site ?? siteConfig.site_url)).

- [ ] Step 1: Decide route-level testing based on the existing Astro test setup

Do not add a brittle route test that imports Astro virtual modules. Use the pure conversion tests from Task 1/2 plus the build assertions in Step 5 unless the current Vitest configuration can import the route without mocks.

- [ ] Step 2: Implement the index route

Create src/pages/wiki/index.json.ts with prerender = true, import siteConfig, getWikiPosts, createWikiIndex, and createJsonResponse, and return the generated index from GET.

- [ ] Step 3: Implement the two article routes

Create both catch-all routes with prerender = true and identical getStaticPaths logic. Type props.post as WikiPost, and use site ?? siteConfig.site_url for absolute URLs.

- [ ] Step 4: Register the Wiki index in sitemap

Add new URL("/wiki/index.json", siteConfig.site_url).toString() to the existing sitemap customPages list in astro.config.mjs. Do not alter existing filter behavior or unrelated Astro integrations.

- [ ] Step 5: Build and inspect generated files

Run:

    pnpm check
    pnpm build

Expected: build succeeds and dist/wiki/index.json plus per-article JSON/Markdown files exist. Inspect one generated article to confirm password/draft/excluded posts are absent and frontmatter is valid.

- [ ] Step 6: Commit the Wiki routes

    git add src/pages/wiki astro.config.mjs
    git commit -m "feat: expose prerendered wiki endpoints"

---

### Task 4: Remove AI search from the browser and shared configuration

Files:
- Modify: src/components/controls/FloatingDock.astro
- Modify: src/components/layout/MobileDock.astro
- Modify: src/components/controls/SearchModal.svelte
- Modify: src/layouts/Layout.astro
- Modify: src/global.d.ts
- Modify: src/i18n/i18nKey.ts
- Modify: src/i18n/languages/en.ts
- Modify: src/i18n/languages/ja.ts
- Modify: src/i18n/languages/ru.ts
- Modify: src/i18n/languages/zh_CN.ts
- Modify: src/i18n/languages/zh_TW.ts
- Modify: src/constants/icons.ts
- Modify: src/config/index.ts
- Delete: src/components/controls/ai-search/
- Delete: src/config/aiSearchConfig.ts
- Delete: src/types/ai-search.ts
- Delete: src/styles/components/ai-search.css

Interfaces:
- SearchModal.svelte continues to expose existing ordinary search behavior and Pagefind result rendering.
- No component may import AISearch, aiSearchConfig, AI search types, AI search session state, or AI search CSS.
- Window no longer declares __aiSearchOpen, __aiSearchMounted, or equivalent AI-only fields.

- [ ] Step 1: Record the current ordinary search behavior

Run:

    pnpm test

Expected: current tests pass; record any pre-existing failure before proceeding.

- [ ] Step 2: Remove AI-only UI wiring

In Layout.astro, remove the ai-search-root, dynamic AISearch import/mount function, and AI keyboard/event listeners, while leaving the ordinary SearchModal loader and other global initialization intact. In FloatingDock, MobileDock, and SearchModal, remove only AI controls/state/imports; do not remove Pagefind loading, query handling, or result navigation.

- [ ] Step 3: Remove AI-only shared symbols

Delete AI-only enum members, translations, icon exports, Window declarations, and the aiSearchConfig export from src/config/index.ts. Keep generic AI wording used by divination or article content when it is not tied to AI search.

- [ ] Step 4: Delete AI-only browser modules and run static reference scan

Delete the AI search component directory, config, type, and stylesheet. Run:

    rg -n -i --glob ''!node_modules/**'' --glob ''!dist/**'' ''AISearch|aiSearch|ai-search|__aiSearch|ai-chat'' src/components src/config src/constants src/global.d.ts src/i18n src/layouts

Expected: no remaining runtime/UI/config references. Historical article text under src/content/posts is not part of this scan.

- [ ] Step 5: Run checks and commit

Run:

    pnpm check
    pnpm type-check
    pnpm test

Expected: all commands pass and ordinary Pagefind search code remains present.

    git add src/components src/config src/constants src/global.d.ts src/i18n src/layouts
    git commit -m "refactor: remove ai search from site ui"

---

### Task 5: Remove AI search backend and scripts while preserving non-AI Workers

Files:
- Modify: functions/_worker.ts
- Delete: src/worker.ts
- Delete: src/server/ai-search/
- Delete: src/workers/cloudflare/ai-search/
- Delete: scripts/ai-search/
- Modify: scripts/indexnow.ts
- Create: scripts/post-loader.ts
- Modify: package.json
- Modify: pnpm-lock.yaml
- Modify: tsconfig.json

Interfaces:
- functions/_worker.ts retains routes for /api/divination/interpret, /api/github-contributions, /api/gallery/*, and /api/dynamic*, plus the gallery fallback and static asset handling.
- scripts/post-loader.ts exports PostFile and loadPostFiles(cwd = process.cwd()): Promise<PostFile[]>.
- loadPostFiles reads src/content/posts/**/*.{md,mdx}, extracts slug, draft, and password, and normalizes Windows path separators.
- scripts/indexnow.ts imports loadPostFiles, loads only .env, excludes draft/password posts, and preserves existing IndexNow modes.
- @cloudflare/vitest-pool-workers, @cloudflare/workers-types, wrangler, and test:worker remain if non-AI Worker tests/build still depend on them.

- [ ] Step 1: Add a backend cleanup guard before deleting code

Run the current Worker tests and capture the baseline:

    pnpm test:worker

Expected: existing non-AI Worker tests pass or any pre-existing failure is recorded. Before deleting, confirm the non-AI imports in functions/_worker.ts are exactly the four handlers named above.

- [ ] Step 2: Remove only the AI route from functions/_worker.ts

Delete the AI runtime import and this route block:

    if (url.pathname === "/api/ai-chat") {
      return handleCloudflareAiSearch(request, env);
    }

Keep all other imports, route checks, gallery fallback, static asset handling, and security headers unchanged.

- [ ] Step 3: Replace the IndexNow article loader before deleting the old loader

Create scripts/post-loader.ts with PostFile and loadPostFiles. Update scripts/indexnow.ts to import it and filter draft/password in all and ids modes. Add a focused script-level test only if the existing Vitest setup can import the Node script without Astro virtual-module errors; otherwise validate with a temporary fixture directory and the existing CLI modes without committing the fixture.

- [ ] Step 4: Delete AI backend and vector-index files

Delete src/server/ai-search/, src/workers/cloudflare/ai-search/, scripts/ai-search/, and src/worker.ts. Do not delete src/workers/cloudflare/divination-ai/, dynamic/, gallery/, or github-contributions/.

- [ ] Step 5: Remove AI-only package and TypeScript references

Remove build-index, build-index:dry-run, and any other script that points exclusively to scripts/ai-search. Remove only dependencies proven unused after the deletion; retain Wrangler and Cloudflare Worker packages needed by functions/_worker.ts, scripts/build-worker.mjs, or Worker tests. Remove the scripts/ai-search/**/*.ts include from tsconfig.json, but keep normal src/**/* and Worker type includes required by remaining Worker code.

- [ ] Step 6: Run preservation scans and tests

Run:

    rg -n -i --glob ''!node_modules/**'' --glob ''!dist/**'' ''ai-search|aiSearch|AISearch|ai-chat|handleCloudflareAiSearch|workers/cloudflare/ai-search|scripts/ai-search'' src functions scripts package.json astro.config.mjs tsconfig.json
    rg -n ''divination-ai|github-contributions|gallery|dynamic'' functions/_worker.ts
    pnpm check
    pnpm type-check
    pnpm test
    pnpm test:worker

Expected: first scan returns no runtime/config references except intentional historical article content if the search scope includes it; second scan still shows all four non-AI Worker routes; all checks pass.

- [ ] Step 7: Commit the backend cleanup

    git add functions/_worker.ts scripts/indexnow.ts scripts/post-loader.ts package.json pnpm-lock.yaml tsconfig.json src/server src/workers src/worker.ts scripts/ai-search
    git commit -m "refactor: remove ai search backend"

---

### Task 6: Full verification and final review

Files:
- Modify only if verification exposes an issue in files from Tasks 1–5.
- Do not modify unrelated homepage, 404, calendar, gallery, or deployment files.

- [ ] Step 1: Run all required verification commands

    pnpm check
    pnpm type-check
    pnpm test
    pnpm test:worker
    pnpm build

Expected: every command exits with code 0.

- [ ] Step 2: Verify generated Wiki outputs

Confirm these files exist after build:

    dist/wiki/index.json
    dist/wiki/articles/ai/ai-blog-ai-search-vectorize.json
    dist/wiki/articles/ai/ai-blog-ai-search-vectorize.md

Parse dist/wiki/index.json and verify each listed article has url, jsonUrl, markdownUrl, headings, and characterCount. Confirm no draft/password/wikiExcluded post appears.

- [ ] Step 3: Verify ordinary search and non-AI Worker preservation

Confirm SearchModal.svelte still contains Pagefind search loading/query behavior, and functions/_worker.ts still contains the divination, GitHub contributions, gallery, and dynamic route handlers.

- [ ] Step 4: Review the final diff and status

Run:

    git diff origin/master...HEAD --stat
    git diff origin/master...HEAD --check
    git status --short --branch

Expected: only the approved design, Wiki migration, and AI-search cleanup files are changed; no unrelated working-tree changes remain.

- [ ] Step 5: Commit any final fix separately

If verification requires a fix, add a focused regression test first, then commit the fix with a specific message:

    git add src/utils/llm-wiki.test.ts src/utils/llm-wiki.ts src/pages/wiki functions/_worker.ts
    git commit -m "fix: correct wiki migration verification issue"

Do not amend earlier commits unless the user explicitly requests a squashed history.

