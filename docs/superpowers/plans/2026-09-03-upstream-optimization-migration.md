# 上游优化移植 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 将提交 20f0e704be5ec613937a31afc65811db1451c59a 的全部功能优化安全移植到当前项目，同时保持现有首页布局、HomePortfolioShutter、动画和响应式表现。

**Architecture:** 按当前项目结构适配，不直接覆盖上游首页。Lenis、Swup CSS 预取和图片优化分别封装；页面样式按实际依赖拆分；语义和暗色主题只改当前项目对应选择器。每项功能先做局部契约验证，最后执行全量类型检查、测试和构建。

**Tech Stack:** Astro 7、TypeScript、GSAP 3 / ScrollTrigger、Lenis、Swup、Vite CSS code splitting、Astro assets / Sharp、Vitest、Biome。

## Global Constraints

- 保留 HomeHero、HomeTicker、HomeDataLayer、HomeBlinds、HomePortfolioShutter 和 HomeMobile。
- 不改变首页卡片尺寸、定位、动画时序和移动端布局。
- Lenis 仅在桌面、精确指针且未启用 prefers-reduced-motion 时运行。
- 图片缺失时保留原有无图路径，不产生布局跳变。
- CSS 预取失败不得阻断正常导航。
- 不删除历史设计文档，不做无关重构、依赖升级或布局重设计。

## 文件映射

- Modify: package.json、pnpm-lock.yaml、astro.config.mjs。
- Create: src/utils/home-smooth-scroll.ts、src/utils/swup-css-prefetch.ts。
- Create or modify: src/components/layout/HomeSmoothScroll.astro。
- Modify: src/pages/index.astro、src/layouts/Layout.astro、src/components/layout/HomeDataLayer.astro、src/styles/components/home-data-layer.css、src/components/controls/SearchModal.svelte、src/components/features/MusicPlayer.astro 和实际包含主题选择器的 CSS 文件。
- Test: src/utils/home-smooth-scroll.test.ts、src/utils/swup-css-prefetch.test.ts，以及现有首页契约测试。

---

### Task 1: 建立依赖与首页滚动控制器

**Interfaces:**
- Produces bootHomeSmoothScroll(): void and teardownHomeSmoothScroll(): void.
- HomeSmoothScroll.astro calls bindHomeLayer with those functions.

- [ ] Write a failing test importing src/utils/home-smooth-scroll.ts and asserting both exports are functions.

    import { describe, expect, it } from "vitest";
    describe("home smooth scroll contract", () => {
      it("exports lifecycle functions", async () => {
        const module = await import("./home-smooth-scroll");
        expect(module.bootHomeSmoothScroll).toBeTypeOf("function");
        expect(module.teardownHomeSmoothScroll).toBeTypeOf("function");
      });
    });

- [ ] Run pnpm vitest run src/utils/home-smooth-scroll.test.ts and confirm the missing-module failure.
- [ ] Add lenis with pnpm and implement guarded boot/teardown. Use media queries (min-width: 769px) and (hover: hover) and (pointer: fine), reduced-motion detection, GSAP ticker synchronization, ScrollTrigger.update, breakpoint cleanup, ticker removal, and Lenis.destroy.
- [ ] Mount the controller through bindHomeLayer without changing current home component order or removing HomePortfolioShutter.
- [ ] Run pnpm vitest run src/utils/home-smooth-scroll.test.ts and pnpm type-check.
- [ ] Commit with feat: add guarded home smooth scrolling.

---

### Task 2: Enable page CSS splitting safely

- [ ] Classify current imports in src/layouts/Layout.astro, src/styles/main.css, src/pages, and page components. Keep layout, navigation, transition, scrollbar, persistent dock, modal, and shared typography styles global.
- [ ] Change only cssCodeSplit: false to cssCodeSplit: true in astro.config.mjs.
- [ ] Run pnpm build. Add only explicit imports needed by concrete missing-style evidence, preserving cascade order.
- [ ] Confirm index.astro still imports home-data-layer.css, home-blinds.css, home-hero.css, home-mobile.css, home-portfolio-shutter.css, home-section.css, and home-ticker.css, and still mounts HomePortfolioShutter.
- [ ] Commit with perf: split page css without changing layout.

---

### Task 3: Add Swup stylesheet prefetching

**Interface:** installSwupCssPrefetch(): void, registered exactly once after window.swup is available.

- [ ] Add tests for root-relative stylesheet acceptance, external URL rejection, duplicate suppression, and href values containing selector-sensitive characters.
- [ ] Run pnpm vitest run src/utils/swup-css-prefetch.test.ts before implementation and confirm failure.
- [ ] Implement DOMParser extraction from target HTML. Accept only root-relative same-origin links, insert media="print" plus data-swup-css-prefetch, and compare normalized HTMLLinkElement.href values via querySelectorAll instead of interpolating raw hrefs into selectors. Fail silently.
- [ ] Register through the existing window.swup / swup:enable path and guard against repeated layout script execution.
- [ ] Run focused tests and pnpm build.
- [ ] Commit with perf: prefetch swup page styles.

---

### Task 4: Add compatible homepage cover-image optimization

- [ ] Inspect src/components/common/CoverImage.astro, src/utils/image-utils.ts, src/config/coverImageConfig.ts, HomeDataLayer.astro, and home-data-layer.css. Record accepted props and current card geometry.
- [ ] Add a failing contract that requires a conditional cover path and preserves guide-card--pinned and guide-card--latest classes.
- [ ] Reuse the existing image pipeline for fixed and recent article entries. Choose 1x/2x widths and sizes from current CSS; preserve lazy loading, async decoding, LQIP, and the no-image path.
- [ ] Add only non-geometric cover styles. Do not change grid tracks, min-heights, padding, transforms, or animation layers.
- [ ] Run pnpm vitest run src/utils/home-guide-contract.test.ts src/utils/home-lifecycle.test.ts and pnpm build.
- [ ] Commit with perf: optimize home guide cover images.

---

### Task 5: Apply semantic, scroll-conflict, and dark-theme fixes

- [ ] Add focused source contracts for the Lenis marker on the existing modal scroll container, the music title semantic tag while retaining its class, and scoped dark-theme selectors.
- [ ] Add the marker to SearchModal.svelte; change only the MusicPlayer title semantics; apply current theme variables to the existing data-card detail, link, and strong selectors.
- [ ] Run pnpm type-check and the focused home contract tests.
- [ ] Commit with fix: preserve theme and semantics during optimization migration.

---

### Task 6: Full verification and layout regression review

- [ ] Run pnpm type-check and pnpm test.
- [ ] Run pnpm build and verify Astro plus Pagefind output.
- [ ] Inspect the final diff for home markup, home-data-layer.css, home-portfolio-shutter.css, and page imports. Revert geometry changes not required for image rendering.
- [ ] Confirm navigating away from and back to home does not duplicate Lenis ticker/listeners; mobile and reduced-motion paths remain native.
- [ ] Commit only concrete verification fixes with chore: verify upstream optimization migration.

## Plan Self-Review

- Coverage includes Lenis, CSS splitting, Swup prefetch, cover images, search scroll conflict, music semantics, dark-theme colors, layout preservation, and final verification.
- No unresolved placeholder or unspecified implementation step is included.
- Interfaces are consistent: bootHomeSmoothScroll, teardownHomeSmoothScroll, and installSwupCssPrefetch.
- Scope excludes history-document deletion, broad dependency upgrades, and homepage replacement.
