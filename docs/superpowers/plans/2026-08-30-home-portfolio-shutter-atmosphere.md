# HomePortfolioShutter Atmosphere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abrupt pure-black entrance of `home-portfolio-shutter` with a deep ink-teal gradient and a seamless transition into the formal artwork rail.

**Architecture:** Keep the existing GSAP scroll timeline and panel structure intact. Use the deep ink-teal gradient and softened mask/interlude backgrounds as the entrance atmosphere without adding an image preview layer.

**Tech Stack:** Astro, TypeScript, CSS, GSAP/ScrollTrigger, Vitest, Astro Check, Astro Build.

## Global Constraints

- Do not modify the `home-portfolio-shutter__rail` structure or panel order.
- Do not modify the content below `home-portfolio-shutter`.
- Do not modify HomeBlinds scroll behavior.
- Do not add an image preview layer.
- Do not add dependencies.
- Respect the existing desktop-only and reduced-motion behavior.

## File Map

- Modify: `G:/ccode/my-blog/src/components/layout/HomePortfolioShutter.astro` — keep the existing rail and scroll timeline without a preview layer.
- Modify: `G:/ccode/my-blog/src/styles/components/home-portfolio-shutter.css` — define the deep ink-teal layers and non-black mask/interlude backgrounds.

### Task 1: Keep the existing artwork structure

**Files:**
- Modify: `G:/ccode/my-blog/src/components/layout/HomePortfolioShutter.astro`

- [ ] Remove the decorative preview element and its first-panel image binding.
- [ ] Keep all existing panel markup byte-for-byte unchanged.
- [ ] Run the Astro component check and confirm the template remains valid.

### Task 2: Define the visual treatment

**Files:**
- Modify: `G:/ccode/my-blog/src/styles/components/home-portfolio-shutter.css`

- [ ] Replace the root and viewport pure-black backgrounds with deep ink-teal gradient tokens.
- [ ] Change the mask and interlude background from opaque black to a deep translucent ink color without changing their z-index or geometry.
- [ ] Preserve white text contrast and all existing panel image styles.

### Task 3: Preserve the existing scroll timeline

**Files:**
- Modify: `G:/ccode/my-blog/src/components/layout/HomePortfolioShutter.astro`

- [ ] Remove preview-specific timeline, cleanup, helper, and test code.
- [ ] Keep the panel, interlude, final scene, and teardown timing unchanged.

### Task 4: Full verification

**Files:**
- No additional files.

- [ ] Run `G:/ccode/my-blog/node_modules/.bin/vitest.cmd run`.
- [ ] Run `G:/ccode/my-blog/node_modules/.bin/tsc.cmd --noEmit`.
- [ ] Run `G:/ccode/my-blog/node_modules/.bin/biome.cmd check G:/ccode/my-blog/src/components/layout/HomePortfolioShutter.astro G:/ccode/my-blog/src/styles/components/home-portfolio-shutter.css`.
- [ ] Run `G:/ccode/my-blog/node_modules/.bin/astro.cmd check`.
- [ ] Run `G:/ccode/my-blog/node_modules/.bin/astro.cmd build`.
- [ ] Run `git diff --check`.
- [ ] Confirm the diff contains no changes to the content below `home-portfolio-shutter`.
