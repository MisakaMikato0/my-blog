# Upstream Navigation Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the local navigation implementation with the exact implementation from upstream commit 1d4976c9bf9981024496e67d0eaa1503b46843c0, while preserving the local navigation-entry data in navBarConfig.links.

**Architecture:** The upstream navigation components, layout integration, and CSS are the source of truth. Local src/config/navBarConfig.ts is deliberately excluded, so existing labels, URLs, grouping, and ordering continue to populate the upstream navigation UI. CategoryBar is removed with its dedicated configuration and CSS hooks.

**Tech Stack:** Astro, TypeScript, Svelte, Tailwind CSS, Swup.

## Global Constraints

- Preserve local src/config/navBarConfig.ts and its navBarConfig.links data unchanged.
- Use upstream commit 1d4976c9bf9981024496e67d0eaa1503b46843c0 as the exact source for navigation implementation and styling.
- Remove local CategoryBar navigation rather than retaining it conditionally.
- Do not commit changes.
- The only permitted verification command is pnpm check; do not run build, lint, browser, unit, or end-to-end tests.

---

### Task 1: Replace navigation implementation files with upstream versions

**Files:**
- Modify: src/components/controls/FloatingDock.astro
- Modify: src/components/layout/ArticleOutlineRail.astro
- Modify: src/components/layout/MobileDock.astro
- Modify: src/components/layout/NavMenuPanel.astro
- Modify: src/components/layout/Navbar.astro
- Modify: src/layouts/Layout.astro
- Modify: src/styles/components/mobile-dock.css
- Modify: src/styles/layout/dropdown-menu.css
- Modify: src/styles/layout/nav-menu-panel.css
- Modify: src/styles/layout/navbar-new.css

**Interfaces:**
- Consumes: existing navBarConfig.links through MainGridLayout.astro.
- Produces: upstream desktop, drawer, floating, mobile, and article-outline navigation behavior.

- [ ] **Step 1: Restore each listed implementation file directly from upstream commit.**

~~~powershell
git checkout 1d4976c9bf9981024496e67d0eaa1503b46843c0 -- src/components/controls/FloatingDock.astro src/components/layout/ArticleOutlineRail.astro src/components/layout/MobileDock.astro src/components/layout/NavMenuPanel.astro src/components/layout/Navbar.astro src/layouts/Layout.astro src/styles/components/mobile-dock.css src/styles/layout/dropdown-menu.css src/styles/layout/nav-menu-panel.css src/styles/layout/navbar-new.css
~~~

- [ ] **Step 2: Do not restore src/config/navBarConfig.ts; it remains the local input data for the upstream Navbar and NavMenuPanel.**

### Task 2: Remove CategoryBar and all its integration hooks

**Files:**
- Modify: src/layouts/MainGridLayout.astro
- Delete: src/components/layout/CategoryBar.astro
- Delete: src/styles/layout/category-bar.css
- Modify: src/styles/main.css
- Modify: src/config/siteConfig.ts
- Modify: src/types/config.ts
- Modify: src/constants/icons.ts
- Modify: src/styles/components/guestbook-chat.css
- Modify: src/styles/pages/categories.css
- Modify: src/styles/pages/music-visualizer.css

**Interfaces:**
- Consumes: upstream MainGridLayout.astro and stylesheet state.
- Produces: main layout with the upstream navigation placement and no CategoryBar configuration, DOM wrapper, icon dependency, or visibility rule.

- [ ] **Step 1: Restore MainGridLayout and the CategoryBar-related stylesheets from upstream.**

~~~powershell
git checkout 1d4976c9bf9981024496e67d0eaa1503b46843c0 -- src/layouts/MainGridLayout.astro src/styles/main.css src/styles/components/guestbook-chat.css src/styles/pages/categories.css src/styles/pages/music-visualizer.css
~~~

- [ ] **Step 2: Remove the CategoryBar component and stylesheet.**

~~~powershell
git rm src/components/layout/CategoryBar.astro src/styles/layout/category-bar.css
~~~

- [ ] **Step 3: Apply only the upstream CategoryBar-removal hunks to siteConfig.ts, types/config.ts, and icons.ts; retain all other local configuration and icons.**

~~~text
Remove siteConfig.categoryBar, SiteConfig.categoryBar, and the two CategoryBar-only icon literals: material-symbols:photo-library-outline-rounded and material-symbols:volunteer-activism-rounded.
~~~

### Task 3: Verify the direct migration under the user's test constraint

**Files:**
- Verify: the files from Tasks 1 and 2 plus unmodified src/config/navBarConfig.ts.

**Interfaces:**
- Consumes: Astro's project-wide static diagnostics.
- Produces: a recorded type and Astro check result for the migrated navigation surface.

- [ ] **Step 1: Confirm the local navigation entries file is untouched and CategoryBar files/references are removed.**

~~~powershell
git diff -- src/config/navBarConfig.ts
git status --short
rg -n --glob '!node_modules' 'CategoryBar|category-bar-wrapper|categoryBar' src
~~~

- [ ] **Step 2: Run the sole permitted verification command.**

~~~powershell
pnpm check
~~~

Expected: no errors attributable to the navigation replacement. Existing hints may be reported separately.
