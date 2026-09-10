# Tools Navbar Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `工具` navbar dropdown containing the existing `工具导航` and `THBWiki` links without adding a new route.

**Architecture:** Add one reusable `LinkPreset` for the top-level dropdown and compose its `children` in `navBarConfig`. Keep `DropdownMenu.astro` and `NavMenuPanel.astro` unchanged because both already render nested `NavBarLink.children` from the shared navbar config.

**Tech Stack:** Astro, TypeScript, Vitest, the existing i18n dictionaries.

## Global Constraints

- Keep `/collections/` as the `工具导航` URL.
- Keep the existing THBWiki external URL and new-window behavior.
- Show `工具导航` before `THBWiki` in the submenu.
- Do not add a `/tools/` route or modify dropdown rendering components.
- Desktop and mobile navigation must consume the same `navBarConfig` structure.

---

### Task 1: Add failing navigation contract tests

**Files:**
- Create: `src/config/tools-nav.test.ts`
- Read: `src/config/navBarConfig.ts`
- Read: `src/constants/link-presets.ts`
- Read: `src/types/config.ts`

**Interfaces:**
- Consumes: the exported `navBarConfig`, `LinkPresets`, and `LinkPreset` values.
- Produces: tests that define the required `Tools` preset and submenu hierarchy for Task 2.

- [ ] **Step 1: Write the failing test**

Create `src/config/tools-nav.test.ts` with these assertions:

```ts
import { describe, expect, it } from "vitest";
import { navBarConfig } from "@/config";
import { LinkPresets } from "@/constants/link-presets";
import { LinkPreset } from "@/types/config";

describe("工具导航接入", () => {

	it("工具是一级下拉菜单，工具导航和 THBWiki 位于其下方", () => {
		const links = navBarConfig.links;
	const tools = links.find(
			(link) =>
				typeof link !== "number" &&
				link.name === LinkPresets[LinkPreset.NavTools].name,
		);

		expect(tools).toEqual({
			...LinkPresets[LinkPreset.NavTools],
			children: [LinkPreset.Collections, LinkPreset.Feibichi],
		});
		expect(tools).toBeDefined();
		expect(links).not.toContain(LinkPreset.Collections);
		expect(links).not.toContain(LinkPreset.Feibichi);
	});

	it("保留两个工具入口的地址和顺序", () => {
		const tools = navBarConfig.links.find(
			(link) =>
				typeof link !== "number" &&
				link.name === LinkPresets[LinkPreset.NavTools].name,
		);
		expect(tools && typeof tools !== "number" ? tools.name : undefined).toBe("工具");
		expect(tools && typeof tools !== "number" ? tools.children : undefined).toEqual([
			LinkPreset.Collections,
			LinkPreset.Feibichi,
		]);
		expect(LinkPresets[LinkPreset.Collections].url).toBe("/collections/");
		expect(LinkPresets[LinkPreset.Feibichi].external).toBe(true);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/config/tools-nav.test.ts`

Expected: FAIL because `LinkPreset.NavTools` and the `工具` submenu do not exist yet.

### Task 2: Implement the shared navbar configuration

**Files:**
- Modify: `src/types/config.ts` in `LinkPreset`
- Modify: `src/i18n/i18nKey.ts`
- Modify: `src/i18n/languages/en.ts`
- Modify: `src/i18n/languages/ja.ts`
- Modify: `src/i18n/languages/ru.ts`
- Modify: `src/i18n/languages/zh_CN.ts`
- Modify: `src/i18n/languages/zh_TW.ts`
- Modify: `src/constants/link-presets.ts`
- Modify: `src/config/navBarConfig.ts`

**Interfaces:**
- Consumes: the existing `Collections` and `Feibichi` presets and `siteConfig.pages.collections` condition.
- Produces: `LinkPreset.NavTools`, `LinkPresets[LinkPreset.NavTools]`, and a top-level `toolsNav` with `children: [LinkPreset.Collections, LinkPreset.Feibichi]` when collections are enabled.

- [ ] **Step 1: Add the enum and translation key**

Add `NavTools = 25` to `LinkPreset` in `src/types/config.ts`, and add `tools = "tools"` beside the existing navbar keys in `src/i18n/i18nKey.ts`.

Add one dictionary entry to each language file:

```ts
[Key.tools]: "Tools", // en.ts
[Key.tools]: "工具", // zh_CN.ts
[Key.tools]: "工具", // zh_TW.ts
[Key.tools]: "ツール", // ja.ts
[Key.tools]: "Инструменты", // ru.ts
```

- [ ] **Step 2: Add the `NavTools` link preset**

Add this entry to `LinkPresets` in `src/constants/link-presets.ts`:

```ts
	[LinkPreset.NavTools]: {
		name: i18n(I18nKey.tools),
		url: "/tools/",
		icon: "material-symbols:build-rounded",
	},
```

The URL is only the required `NavBarLink` shape; the dropdown trigger has children and therefore does not navigate.

- [ ] **Step 3: Compose the dropdown and remove duplicate top-level entries**

In `src/config/navBarConfig.ts`, add this before `postsNav`:

```ts
	const toolsNav: NavBarLink = {
		...LinkPresets[LinkPreset.NavTools],
		children: [
			...(siteConfig.pages.collections ? [LinkPreset.Collections] : []),
			LinkPreset.Feibichi,
		],
	};
```

Then update the top-level `links` array to begin with:

```ts
	const links: (NavBarLink | LinkPreset)[] = [
		LinkPreset.Home,
		toolsNav,
		postsNav,
		hobbyNav,
		...(contactNav ? [contactNav] : []),
		myNav,
	];
```

Update the nearby ordering comment to say `主页 → 工具 → 文章 → 爱好 → 联系我 → 我的`.

- [ ] **Step 4: Run the focused tests**

Run: `pnpm vitest run src/config/tools-nav.test.ts src/config/divination-nav.test.ts`

Expected: PASS, with the tools submenu ordered as `Collections` then `Feibichi` and the existing divination navigation unchanged.

### Task 3: Verify type safety and repository behavior

**Files:**
- Verify: `src/config/tools-nav.test.ts`
- Verify: `src/config/navBarConfig.ts`
- Verify: `src/constants/link-presets.ts`
- Verify: `src/i18n/i18nKey.ts`
- Verify: all five language dictionaries

**Interfaces:**
- Consumes: the completed shared navbar configuration from Task 2.
- Produces: verified type-check and test results.

- [ ] **Step 1: Run the complete test suite**

Run: `pnpm test`

Expected: Vitest exits with code 0 and all tests pass.

- [ ] **Step 2: Run Astro's type/content check**

Run: `pnpm type-check`

Expected: TypeScript exits with code 0 without errors from the new enum, translation key, or navigation structure.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only the planned navbar/i18n/test files are modified, alongside the already committed design and plan documents.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/config/tools-nav.test.ts src/config/navBarConfig.ts src/constants/link-presets.ts src/types/config.ts src/i18n/i18nKey.ts src/i18n/languages/en.ts src/i18n/languages/ja.ts src/i18n/languages/ru.ts src/i18n/languages/zh_CN.ts src/i18n/languages/zh_TW.ts
git commit -m "feat: group tool links in navbar"
```
