# Swup 4 Lifecycle Migration Implementation Plan

> For agentic workers: implement this plan task by task with tests after each task.

Goal: 移植 Swup 4 生命周期和 HomeBlinds 资源清理逻辑，不改变当前项目布局。

Architecture: 保留现有组件 DOM 和样式，仅替换失效的旧 Swup 事件监听。HomeBlinds 通过统一 teardown 管理异步初始化、GSAP 时间线和 ScrollTrigger，并在容器替换前清理、页面加载后重建。

Tech Stack: Astro 7.1.6, @swup/astro 1.8.0, TypeScript, GSAP, ScrollTrigger, Vitest.

Global constraints:
- 不修改 HTML 结构、布局 CSS、动画参数和依赖版本。
- 不整体 cherry-pick 上游提交，因为其中包含与本需求无关的首页内容和布局变化。
- 所有行为变更必须有回归测试或源码契约测试覆盖。

Tasks:
1. 创建生命周期回归契约测试，并先运行确认旧代码失败。
2. 修改 VisitorCount、FloatingLyrics、HomeDataLayer、HomeMobile、WeatherWidget 的生命周期监听。
3. 修改 HomeBlinds 组件和控制器，加入替换前 teardown、异步初始化失效和逆序 cleanup，同时保留现有布局标记。
4. 运行 Vitest、type-check、astro check、build 和 git diff --check。
