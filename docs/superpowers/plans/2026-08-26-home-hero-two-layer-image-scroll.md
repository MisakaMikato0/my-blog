# 首页 Hero 两层图片滚动效果迁移实施计划

> 目标：移除当前首页 Hero 的滚动图片变化/切换链路，局部移植上游 `home-hero-two-layer` 两层滚动体验；保留文字动画、签名/字雨、樱花/雨滴和 `HomeDisplayLayer`。

## 约束与验收

- 保留 `ScrollTrigger` 的 `id: "home-hero-two-layer"` 及 Hero pin，因此滚动时应继续生成 `pin-spacer-home-hero-two-layer`。
- 桌面端初始阶段展示上游生成的 4×6 随机碎片布局；交互阶段碎片按同一图片拼合为完整画面，并由该完整画面连续放大。
- 滚动过程中不得通过图片数组重新选择或替换 `src`/CSS 图片变量；图片资源仍由当前配置提供。
- 不修改 `src/utils/home-hero-fly-text.ts`、`src/utils/home-hero-rain.ts`、`src/components/layout/HomeDisplayLayer.astro`、`src/styles/components/home-display-layer.css`、`src/utils/home-display-layer.js`。
- 不覆盖用户已有的 `src/constants/icons.ts` 本地修改。

## 任务 1：建立基线并补充回归测试

**文件：** `src/utils/home-hero-motion.test.ts`

1. 运行现有测试：

   ```text
   pnpm vitest run src/utils/home-hero-motion.test.ts
   ```

2. 保留已有 phase、雨幕不透明度、tile depth、pin distance 和 completion transform 测试。
3. 补充以纯函数为边界的回归断言：
   - `createHeroTileLayout({ rows: 4, columns: 6, ... })` 返回 24 个唯一网格碎片；
   - `idleVisible` 被限制在至少 1 个且不超过碎片总数；
   - `getHeroPinEndDistance()` 在非法/负数输入下不返回负值，且使用视口最小距离兜底；
   - completion transform 对不同 mosaic 尺寸始终返回有限的 `y` 与 `scale`，且 `scale >= 1`；
   - 测试固定 seed 让初始随机布局稳定，避免用 `Math.random()` 作为断言依据。
4. 先运行新增测试确认它们在当前实现上给出预期的失败/差异，再实现迁移；若当前实现已满足纯函数断言，则记录为基线通过，不为了制造失败而破坏现有行为。

## 任务 2：收敛 Hero motion 纯函数

**文件：** `src/utils/home-hero-motion.ts`

1. 以当前本地版本为基础保留仍被文字、雨滴和现有测试使用的导出。
2. 对齐上游 4×6 布局生成规则：使用 seeded random、洗牌 reveal order、初始可见碎片的偏移/旋转/缩放/模糊与 `idleDepth`。
3. 统一碎片 transform 类型，支持 `scaleX`、`scaleY`，并保留当前 completion transform、pin distance 等兼容导出。
4. 确保函数只计算布局/滚动映射，不读取 DOM、不切换图片源，以便测试和回滚安全。

## 任务 3：恢复组件层的静态两层图片结构

**文件：** `src/components/layout/HeroMosaic.astro`

1. 保留当前 `data-hero-backdrop`、`data-hero-mosaic`、`data-hero-tile`、`data-hero-mosaic-complete` 结构和 4×6 数据属性。
2. 保留当前桌面/移动图片路径和 CSS 变量。
3. 删除刷新时从 `images` 数组随机改写 CSS 背景、`picture source[srcset]` 和图片 `src` 的 inline script；组件不再负责运行时换图。
4. 不改动 Hero 文字、签名、雨滴相关组件。

## 任务 4：局部迁移控制器的图片滚动驱动

**文件：** `src/utils/home-hero-controller.ts`

1. 保留当前文字 intro、fly text、signature、occupation、contact scatter、rain 初始化及销毁流程。
2. 将当前图片滚动 timeline 改为上游独立 scroll driver：
   - 创建 `timeline` 负责图片层和保留的文字层；
   - 创建以 `progress` 为目标的 `scrollDriver`，其 `onUpdate` 将进度映射到 timeline；
   - 用 `ScrollTrigger.create({ id: "home-hero-two-layer", trigger: hero, pin: hero, ... })` 驱动 scroll driver，避免图片滚动中途切换源。
3. 初始段保持碎片随机布局；交互段按 4×6 网格归位，清理透视/阴影/模糊并显示完整图。
4. 完整图完成后只对当前完成层做连续 `x/y/scale` 变换，不创建或切换第二张滚动图片。
5. 保留并适配当前文字和雨滴在同一 timeline 上的时间点/进度更新。
6. 迁移上游 refresh 前恢复初始 timeline、refresh 后重新同步 scroll driver 的逻辑，确保改变窗口尺寸后可以正常回滚。
7. 保留 reduced-motion、移动端处理、reload 处理及 destroy 清理；不得引入上游未要求的 `HomeBlinds`、dialogue、sticker 或导航改动。

## 任务 5：同步图片层 CSS

**文件：** `src/styles/components/home-hero.css`

1. 仅比较并迁移上游两层图片所需的 grid/tile/complete/backdrop 定位、裁切、transform-origin、overflow、opacity 和 pointer-events 规则。
2. 不覆盖文字、签名、rain、dialogue 或页面其他选择器。
3. 确保 tile image 使用同一桌面/移动 CSS 图片变量，完成层位于同一视觉容器中并可连续放大。

## 任务 6：配置与类型核对

**文件：** `src/config/homeConfig.ts`、`src/types/config.ts`

1. 核对 rows/columns/idleVisible/pin distance 等字段与上游两层方案一致。
2. 只补充图片滚动所必需的字段和类型；不迁移 HomeBlinds 或无关导航配置。
3. 确认当前首页仍固定为 4×6（24 个）碎片，且桌面/移动图片路径兼容。

## 任务 7：验证与保护边界检查

1. 检查 `git diff`，确认以下保护文件无本任务产生的修改：

   ```text
   src/utils/home-hero-fly-text.ts
   src/utils/home-hero-rain.ts
   src/components/layout/HomeDisplayLayer.astro
   src/styles/components/home-display-layer.css
   src/utils/home-display-layer.js
   ```

2. 确认 `src/constants/icons.ts` 仍仅保留任务开始前的用户本地修改。
3. 运行完整验证：

   ```text
   pnpm test
   pnpm type-check
   pnpm check
   git diff --check
   ```

4. 检查 diff 中不存在 `HomeBlinds` 迁移、不存在滚动期间图片源切换、不存在保护文件改动。
5. 由于当前仓库 `.git` 曾无法创建 `index.lock`，若提交仍被拒绝，只保留工作区修改并明确说明未提交原因，不触碰用户文件。

## 执行顺序

任务 1 → 任务 2 → 任务 3 → 任务 4 → 任务 5 → 任务 6 → 任务 7。

