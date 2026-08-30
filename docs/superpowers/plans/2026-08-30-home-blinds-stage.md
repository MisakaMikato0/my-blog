# HomeBlinds Stage Implementation Plan

> For agentic workers: use task-by-task execution with review checkpoints. Steps use checkbox syntax for tracking.

Goal: 将上游 HomeBlinds 完整功能嵌入现有 HomeDisplayLayer 的作品展示 stage，只替换该 stage 内部，不改变外层和下方 portfolio shutter 内容。

Architecture: 保留 HomeDisplayLayer.astro 作为唯一外层和滚动生命周期宿主，把上游 HomeBlinds 结构嵌入 data-display-stage。HomeBlinds 控制器通过显式 root/viewport 接口挂载到嵌入子树，并限制查询范围；原有展示层旧文字时间线停止操作被替换的节点，portfolio shutter 逻辑保持原样。

Tech Stack: Astro 7, TypeScript, GSAP 3, ScrollTrigger, Vitest, pnpm.

## Global Constraints

- 只替换 div.home-display-layer__stage[data-display-stage] 内部内容。
- 保留 HomeDisplayLayer 外层、viewport、滚动占位、其它动画节点和下方内容。
- 迁入上游 HomeBlinds 三段提交链的全部相关组件、控制器、样式、类型、配置和图片资源。
- 桌面端启用；移动端和 prefers-reduced-motion 不启动桌面 HomeBlinds 控制器。
- 不迁入与 HomeBlinds 无关的文章、友链、其它首页和资源改动。

## File Map

- Create: src/components/layout/HomeBlinds.astro - 可嵌入的 HomeBlinds stage DOM、场景列表、20 格进度电池和运行时配置。
- Create: src/components/layout/HomeBlindsScene.astro - 五种场景版式及装饰节点。
- Create: src/styles/components/home-blinds.css - HomeBlinds 视觉样式、布局、动效和响应式降级。
- Create: src/utils/home-blinds-controller.ts - HomeBlinds GSAP/ScrollTrigger 控制器及清理逻辑。
- Create: src/utils/home-blinds-controller.test.ts - 控制器纯函数/配置边界测试，避免依赖真实浏览器动画。
- Modify: src/components/layout/HomeDisplayLayer.astro - 在既有 stage 中挂载 HomeBlinds，并阻止旧展示文字时间线接管新 DOM。
- Modify: src/styles/components/home-display-layer.css - 将 stage 改成 HomeBlinds 的嵌入定位上下文，同时保持外层现有 shutter 样式。
- Modify: 实际全局样式入口 - 引入 home-blinds.css。
- Modify: src/config/homeConfig.ts - 增加上游 HomeBlinds 默认配置。
- Modify: src/types/config.ts - 增加 HomeBlinds 配置类型。
- Modify: src/config/index.ts - 保持 HomeBlinds 类型导出和配置推导一致。
- Create: public/assets/images/home-blinds/** - 上游 HomeBlinds 所需图片。

### Task 1: Establish Failing Contract Tests

Files:
- Create: src/utils/home-blinds-controller.test.ts
- Create: src/utils/home-blinds-contract.test.ts

Interfaces:
- Test exported normalizeHomeBlindsRuntimeConfig and bootHomeBlinds root injection contract.

- [ ] Step 1: Write tests asserting the desired public contract

The unit test must pass an incomplete runtime config and assert that sceneCount is clamped to 5, standCount to 0, and default foregroundOpacity and pointerTravel are applied. The markup contract test must read HomeDisplayLayer.astro and assert that it still contains data-display-stage and data-shutter-final-video while also containing the HomeBlinds mount.

- [ ] Step 2: Run focused tests and confirm the expected RED failure

Run: pnpm vitest run src/utils/home-blinds-controller.test.ts src/utils/home-blinds-contract.test.ts
Expected: FAIL because the HomeBlinds module and stage mount do not exist yet.

### Task 2: Migrate Components, Styles, and Assets

Files:
- Create: src/components/layout/HomeBlinds.astro
- Create: src/components/layout/HomeBlindsScene.astro
- Create: src/styles/components/home-blinds.css
- Create: public/assets/images/home-blinds/**

Interfaces:
- HomeBlinds.astro consumes homeConfig.homeBlinds and outputs a subtree safe to place inside data-display-stage.
- HomeBlindsScene.astro consumes index, total, item, and composite props.

- [ ] Step 1: Restore the exact upstream component/style/resource files

Use the requested commit as source for the five implementation artifacts and all HomeBlinds image files. Do not restore unrelated files.

- [ ] Step 2: Convert HomeBlinds root to embedded mode

Remove page-level fixed wrapper semantics and make the component accept a required embedded prop. Preserve all data-home-blinds selectors and scene DOM. The rendered root must remain inside the existing stage and use the stage containing block.

- [ ] Step 3: Import the component stylesheet from the existing style entry

Add exactly one import for the component stylesheet at the repository's current global component style entry. Keep media-query hiding for mobile and reduced motion.

- [ ] Step 4: Run Astro validation for the migrated templates

Run: pnpm astro check
Expected: no new HomeBlinds template errors.

### Task 3: Add Configuration and Type Contracts

Files:
- Modify: src/types/config.ts
- Modify: src/config/homeConfig.ts
- Modify: src/config/index.ts

Interfaces:
- Add HomeBlindsSceneItem, HomeBlindsHeadlineConfig, and HomeBlindsConfig exactly matching the migrated component/controller data shape.

- [ ] Step 1: Add the type definitions and HomeConfig property

Add homeBlinds: HomeBlindsConfig while retaining displayLayer and portfolioShutter.

- [ ] Step 2: Add upstream default values

Use the final upstream homeBlinds block, including reveal images, headline messages, scene copy, cycle images, four scene items, and stand images.

- [ ] Step 3: Run type checking and fix only migration-related diagnostics

Run: pnpm type-check
Expected: any pre-existing src/utils/content-utils.ts diagnostic is recorded separately; HomeBlinds diagnostics are fixed.

### Task 4: Adapt Controller and Mount It in the Existing Stage

Files:
- Modify: src/utils/home-blinds-controller.ts
- Modify: src/components/layout/HomeBlinds.astro
- Modify: src/components/layout/HomeDisplayLayer.astro
- Modify: src/styles/components/home-display-layer.css
- Test: src/utils/home-blinds-controller.test.ts

Interfaces:
- Export normalizeHomeBlindsRuntimeConfig(input: unknown): HomeBlindsRuntimeConfig.
- Export bootHomeBlinds(options?: { root?: HTMLElement; viewport?: HTMLElement }): Cleanup | void.
- When no root is passed, discover [data-home-blinds]; when passed, never query outside it.

- [ ] Step 1: Extend controller with explicit root and viewport options

The entry point must accept an optional root and viewport, return without side effects when either is missing or the root is disabled, and keep all GSAP initialization and cleanup scoped to the injected root.

- [ ] Step 2: Reuse the outer viewport scroll lifecycle without changing downstream shutter markup

Attach the HomeBlinds timeline to the existing data-display-viewport and derive progress from the stage active scroll interval. Do not create a new page-level HomeBlinds section or second scroll spacer.

- [ ] Step 3: Replace the stage three legacy text nodes with HomeBlinds embedded

Keep the existing div.home-display-layer__stage[data-display-stage] element and all siblings after it unchanged. Import the component and mount it only inside this div.

- [ ] Step 4: Guard legacy text animation against missing nodes

The old text timeline must no-op when data-display-kicker, data-display-title, and data-display-desc are absent, while portfolio shutter selectors and timing remain unchanged.

- [ ] Step 5: Run focused tests and inspect generated markup

Run: pnpm vitest run src/utils/home-blinds-controller.test.ts src/utils/home-blinds-contract.test.ts and pnpm astro check.
Expected: focused tests pass and no new Astro diagnostics.

### Task 5: Verify Integration and Regression Boundaries

Files:
- No new source files.

- [ ] Step 1: Run all unit tests

Run: pnpm test
Expected: all existing tests pass.

- [ ] Step 2: Run production build

Run: pnpm build
Expected: build completes; if an existing unrelated diagnostic blocks it, report the exact command and diagnostic.

- [ ] Step 3: Run dev server and inspect desktop, mobile, and reduced-motion behavior

Run: pnpm dev -- --host 127.0.0.1 and use the local browser at the reported URL. Check that desktop scroll changes HomeBlinds scenes and meter blocks, the following portfolio shutter remains present, mobile hides HomeBlinds, and reduced-motion does not initialize it.

- [ ] Step 4: Review diff scope

Run: git diff --stat and git diff -- src/pages/index.astro src/components/layout/HomeDataLayer.astro.
Expected: no changes to unrelated homepage modules and no deletion of portfolio shutter markup.

