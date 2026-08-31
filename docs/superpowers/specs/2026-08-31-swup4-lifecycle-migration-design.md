# Swup 4 生命周期清理优化设计

## 目标

移植上游提交 8657bdc51aecd0e14d22a859810f840d80d80739 中与 Swup 4 生命周期和动态资源清理相关的改动，同时保持当前页面布局、HTML 结构、样式和内容不变。

## 范围

- 使用 Astro 生命周期事件 astro:page-load 与 astro:before-swap。
- 移除仍存在的 Swup 3 事件监听。
- 在 HomeBlinds 容器替换前销毁 GSAP/ScrollTrigger 资源，并使未完成的异步初始化失效。
- 保持 HomeBlinds 当前组件属性、DOM 结构和布局 CSS 不变。
- 修复 WeatherWidget 的替换前清理监听。

## 非目标

- 不迁移上游提交中首页文案、数据卡片、天气组件结构或布局调整。
- 不修改 CSS、动画参数、页面容器结构或路由配置。
- 不升级依赖版本。

## 验收标准

1. 源码中不再使用 swup:contentReplaced 或 swup:willReplaceContent。
2. HomeDataLayer、HomeMobile、WeatherWidget 在 astro:before-swap 执行清理。
3. HomeBlinds 在 astro:before-swap 执行 teardown，并在 astro:page-load 重新 boot。
4. HomeBlinds 的现有布局属性、DOM 标记和 CSS 文件保持不变。
5. Vitest、Astro check、TypeScript 检查和生产构建通过。
