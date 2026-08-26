# 首页 Hero 两层图片滚动效果迁移设计

## 目标

将首页 Hero 当前的图片滚动变化逻辑替换为上游的两层滚动体验：首屏展示熔化标题与随机碎片，继续滚动时让 4×6 碎片拼合成完整画面，并由同一画面连续放大覆盖 Hero。

## 范围

### 包含

- 保留 `ScrollTrigger` 的 `id: "home-hero-two-layer"`，继续使用 Hero pin 产生 `pin-spacer-home-hero-two-layer`。
- 迁移上游的滚动驱动器、时间线进度映射、碎片初始布局、碎片拼合和连续放大逻辑。
- 迁移与上述图片动画直接相关的 Hero 配置、碎片变换类型、组件数据属性和 CSS。
- 保留现有的图片资源路径体系，必要时补齐上游使用的 Hero 完成图资源。
- 为滚动进度映射和完成图变换保留或补充自动化测试。

### 不包含

- 不删除或重构 `HomeDisplayLayer` 及其相关文件。
- 不修改文字动画、签名/字雨效果。
- 不修改樱花/雨滴效果及其控制逻辑。
- 不迁移后续 `HomeBlinds` 百叶窗实现。
- 不处理与本次 Hero 图片滚动无关的导航栏、移动端 Dock 或其他页面改动。

## 方案

### 组件层

以现有 `HeroMosaic.astro` 为基础，采用上游的碎片和完成图层结构。保留当前文字、签名和樱花/雨滴节点，使图片层与其他 Hero 效果保持独立。

### 动画层

在 `home-hero-controller.ts` 中使用独立的 GSAP scroll driver：

1. 将 `ScrollTrigger` 的滚动进度映射到 Hero 时间线。
2. 在初始阶段保持随机碎片和熔化标题。
3. 在交互阶段将 4×6 碎片归位、清除透视/阴影/模糊并显示完成图。
4. 使用完成图所在的同一视觉层连续计算放大和位移，避免滚动中途突然切换到另一张图片。
5. 在 `ScrollTrigger.refresh()` 前后保持时间线和滚动驱动器进度一致，确保调整视窗后可以正常回滚。

### 配置和样式层

只同步马赛克图片滚动所需的配置字段、碎片变换类型和 `home-hero.css` 规则。现有文字和樱花相关选择器、时间线和资源不覆盖。

## 文件边界

主要修改文件：

- `src/components/layout/HeroMosaic.astro`
- `src/styles/components/home-hero.css`
- `src/utils/home-hero-controller.ts`
- `src/utils/home-hero-motion.ts`
- `src/utils/home-hero-motion.test.ts`
- `src/config/homeConfig.ts`
- `src/types/config.ts`

明确保留不动：

- `src/components/layout/HomeDisplayLayer.astro`
- `src/styles/components/home-display-layer.css`
- `src/utils/home-display-layer.js`
- `src/utils/home-hero-fly-text.ts`
- `src/utils/home-hero-rain.ts`

## 测试和验收

- 单元测试覆盖滚动进度映射的边界、连续性和刷新后的恢复行为。
- 运行项目已有的类型检查、格式检查和测试命令。
- 检查 `home-hero-two-layer` 仍由 `ScrollTrigger` 创建并保留 pin 行为。
- 检查滚动过程中图片只执行碎片拼合和连续放大，不再发生旧逻辑中的图片切换。
- 检查文字动画和樱花/雨滴文件没有被迁移覆盖。
- 检查当前已有的 `src/constants/icons.ts` 未提交修改不被带入本次提交。
