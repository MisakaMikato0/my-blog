# Upstream UI Refactor Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将上游提交 `f5515eb4e4ca8975ecce281542b770c549413397` 的大纲面板、导航资料卡和日历迁移能力分别适配到当前项目，并修复验证阶段发现的类型错误。

**Architecture:** 使用上游提交作为只读参考，通过按功能拆分的文件补丁迁移，不执行 `git pull`、`merge` 或直接覆盖当前分支。目录树和日历里程碑逻辑保持为纯 TypeScript 模块并用 Vitest 覆盖；Astro 组件、生命周期注册和样式在当前项目的现有布局结构上重新接线。

**Tech Stack:** Astro 7、TypeScript、Astro Content Collections、Swup、Vitest、Biome、CSS。

## Global Constraints

- 不直接拉取或合并上游提交；只使用该提交的文件差异和代码作为迁移参考。
- 保留当前项目已有的天气、主页、图库、文章列表及本地分支改动。
- 不引入上游提交未声明的新依赖。
- 所有新增纯逻辑必须先写失败测试，再实现最小代码。
- 完成前必须运行测试、`astro check`、`tsc --noEmit` 和生产构建。

---

### Task 1: 建立迁移分支、恢复验证环境并记录基线

**Files:**
- Modify: Git branch/worktree metadata only; no source changes.
- Test: Existing project commands `pnpm test`, `pnpm check`, `pnpm type-check`.

**Interfaces:**
- Consumes: Current clean `master` at `1f478a0e` and upstream reference commit.
- Produces: A working branch named `codex/merge-f5515eb4`, restored dependencies, and recorded baseline failures.

- [ ] **Step 1: Create a dedicated implementation branch from the clean current master.**

  Run: `git switch -c codex/merge-f5515eb4`

- [ ] **Step 2: Restore the local dependency directory from the committed lockfile.**

  Run: `pnpm install --frozen-lockfile`

- [ ] **Step 3: Run the baseline checks and record exact errors before changing source.**

  Run: `pnpm test`, `pnpm check`, `pnpm type-check`

### Task 2: Add tested pure data logic and fix the existing type errors

**Files:**
- Create: `src/utils/article-toc-tree.ts`
- Create: `src/utils/calendar-milestones.ts`
- Modify: `src/utils/content-utils.ts:1-240`
- Test: `tests/article-toc-tree.test.ts`
- Test: `tests/calendar-milestones.test.ts`

**Interfaces:**
- Produces: `collectTocTree()`, `getHolidayOccurrences()`, `milestoneFromOccurrences()`, and type-safe content utility returns.

- [ ] **Step 1: Write failing tests for heading hierarchy normalization, missing IDs, multi-day holiday collapsing, and milestone progress.**

  The tests must assert that `h2 → h3 → h2` produces parent indexes `[-1, 0, -1]`, adjacent same-name holiday dates collapse to one occurrence, and a yearly milestone reports bounded progress and remaining days.

- [ ] **Step 2: Run only the new tests and verify they fail because the new modules do not yet exist.**

  Run: `pnpm vitest run tests/article-toc-tree.test.ts tests/calendar-milestones.test.ts`

- [ ] **Step 3: Implement the pure modules with no DOM side effects outside the explicit DOM collector.**

  Preserve the upstream public types but adapt imports and naming to the current project aliases.

- [ ] **Step 4: Fix the three `content-utils.ts` type errors at their source.**

  Keep cached collection values nullable internally, return concrete arrays/maps from public functions, and narrow unknown category values before passing them to string-only URL helpers.

- [ ] **Step 5: Run the focused tests and the type checker.**

  Run: `pnpm vitest run tests/article-toc-tree.test.ts tests/calendar-milestones.test.ts` and `pnpm type-check`.

### Task 3: Port the article TOC panel as a page island

**Files:**
- Create: `src/components/layout/ArticleTocPanel.astro`
- Create: `src/styles/components/article-toc-panel.css`
- Create: `src/utils/article-toc-panel-controller.ts`
- Modify: `src/layouts/MainGridLayout.astro`
- Modify: `src/utils/layout-init.ts`
- Modify: `src/styles/main.css`
- Modify: `src/styles/transition.css`

**Interfaces:**
- Consumes: `collectTocTree()` and the existing Swup lifecycle helpers.
- Produces: A post-only `#article-toc-panel` that mounts once per page generation, hides on pages without headings, and cleans up listeners on navigation.

- [ ] **Step 1: Add the Astro shell and verify `astro check` reports the expected missing-controller/import failures.**
- [ ] **Step 2: Add the controller with active-heading tracking, accordion state, progress updates, SVG trail drawing, and mind-map dialog cleanup.**
- [ ] **Step 3: Add responsive CSS and wire the component into the existing post layout without changing non-post pages.**
- [ ] **Step 4: Run `pnpm check` and the focused utility tests.**

### Task 4: Port the navbar profile card and shared dropdown behavior

**Files:**
- Create: `src/components/layout/NavbarProfileCard.astro`
- Create: `src/styles/layout/navbar-profile-card.css`
- Create: `src/utils/navbar-dropdown-controller.ts`
- Create: `src/utils/navbar-profile-controller.ts`
- Modify: `src/components/layout/Navbar.astro`
- Modify: `src/components/layout/DropdownMenu.astro`
- Modify: `src/styles/layout/dropdown-menu.css`
- Modify: `src/config/navBarConfig.ts`
- Modify: `src/constants/link-presets.ts`

**Interfaces:**
- Consumes: Existing navbar links, i18n keys, calendar milestone data, and Swup lifecycle helpers.
- Produces: A shared dropdown panel and a Logo profile card that work with keyboard focus, desktop hover, mobile navigation, and Swup page changes.

- [ ] **Step 1: Add failing DOM-level tests for dropdown page selection and profile-card cleanup where the current test environment supports them.**
- [ ] **Step 2: Port the smallest shared dropdown controller and profile-card controller needed by the existing navbar markup.**
- [ ] **Step 3: Update navbar markup/config and remove only the obsolete personal-site preset now rendered by the profile card.**
- [ ] **Step 4: Run `pnpm check` and the focused test set.**

### Task 5: Migrate calendar ownership and complete i18n/config wiring

**Files:**
- Delete: `src/components/controls/CalendarWidget.astro`
- Delete: `src/components/features/CalendarManager.astro`
- Delete: `src/styles/components/calendar-widget.css`
- Delete: `src/utils/calendar-events.ts`
- Modify: `src/components/controls/FloatingDock.astro`
- Modify: `src/components/layout/MobileDock.astro`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/config/calendarConfig.ts`
- Modify: `src/types/config.ts`
- Modify: `src/i18n/i18nKey.ts` and all language files.

**Interfaces:**
- Consumes: `calendar-milestones.ts` and the new navbar profile card.
- Produces: No stale calendar imports, a single site-anniversary configuration, and equivalent mobile/desktop navigation behavior.

- [ ] **Step 1: Search for every old calendar symbol and write the migration map before deleting files.**
- [ ] **Step 2: Move the active calendar data path to `siteAnniversary` and update all language/config types.**
- [ ] **Step 3: Remove stale desktop/mobile dock and layout registrations.**
- [ ] **Step 4: Run `rg` checks for stale symbols and run all tests/checks.**

### Task 6: Final integration verification

**Files:**
- Modify: Only files required by failing verification output.

- [ ] **Step 1: Run the complete test suite.**

  Run: `pnpm test`

- [ ] **Step 2: Run static validation.**

  Run: `pnpm check` and `pnpm type-check`

- [ ] **Step 3: Run the production build and inspect warnings.**

  Run: `pnpm build`

- [ ] **Step 4: Confirm the final diff is limited to the planned migration and report any remaining non-blocking warnings with exact file paths.**
