# Weather Widget Design Article Implementation Plan

**Goal:** 将天气组件重构过程提炼为一篇设计复盘文章，并以正式文章发布到“设计文档”分类。

**Architecture:** 创建一篇独立的 Markdown 文章，沿用现有文章的 frontmatter 和叙事方式。正文围绕视觉基准、桌面与移动端布局、背景氛围、信息层级和动画节奏展开，不复制完整组件源码。

**Tech Stack:** Astro Content Collections、Markdown、Biome、Astro check。

## Global Constraints

- 文章使用 title、published、description、tags、category、draft frontmatter。
- 文章放在 src/content/posts/projects/。
- category 精确为“设计文档”，draft 为 false。
- 发布日期为 2026-09-16。
- 不虚构接口返回字段、性能数据或用户反馈。
- 不粘贴完整组件源码，以设计决策和界面结构为主。

---

### Task 1: 创建设计复盘文章

**Files:**
- Create: src/content/posts/projects/projects-weather-widget-responsive-design.md
- Reference: src/components/widget/WeatherWidget.astro

**Interfaces:**
- Consumes: 已完成的天气组件视觉重构事实，包括 Responsive weather scene 视觉基准、PC 横向布局、手机竖向折叠、/pc 与 /mp 背景接口、默认背景回退、污染物单行展示和 1.25 秒入场动画。
- Produces: 一篇 frontmatter 可被 posts collection 解析、分类为“设计文档”的已发布 Markdown 文章。

- [ ] **Step 1: 编写文章 frontmatter 和正文**

使用标题“把天气组件做成一块有氛围的响应式场景”，发布日期 2026-09-16，分类“设计文档”，状态 draft false，标签为天气组件、响应式设计、UI设计、设计复盘。

正文依次包含：为什么要重新设计天气组件；先确定统一的视觉基准；PC 端：把信息展开成横向场景；移动端：先保留核心，再展开完整数据；背景图如何成为氛围层；信息展示的优先级；让动画服务于阅读；这次重构留下的设计经验。

每节结合实际改动说明取舍：解释旧组件与预览稿不一致的原因，说明 Responsive weather scene 如何成为单一视觉基准；记录 PC 端污染物六项同排、移动端底部箭头展开、背景接口失败回退和慢速右侧入场动画。

- [ ] **Step 2: 对照现有文章调整语气和格式**

检查文章是否具备设计文档常见的技术复盘特征：短段落、明确的小节、必要时使用简短列表；删除完整源码、未经证实的数据和与天气组件无关的内容。

- [ ] **Step 3: 验证文章内容契约**

检查 frontmatter 分类和发布状态存在，正文覆盖视觉基准、PC、移动端、污染物和动画节奏。

- [ ] **Step 4: 提交文章**

提交消息使用“docs: 发布天气组件响应式设计复盘”。

### Task 2: 验证内容集合和项目质量

**Files:**
- Verify: src/content/posts/projects/projects-weather-widget-responsive-design.md
- Verify: src/content.config.ts

**Interfaces:**
- Consumes: Task 1 生成的 Markdown 文章。
- Produces: 可被 Astro 内容集合加载的正式文章，以及明确的检查结果。

- [ ] **Step 1: 运行格式和内容检查**

运行 Biome 格式化和 pnpm exec astro check，预期返回 0 errors；已有无关提示可以保留，但不得新增天气文章相关错误。

- [ ] **Step 2: 检查工作区和最终 diff**

运行 git diff --check、git status --short 和 git log -1 --oneline，确认文章无空白错误，且没有意外修改。
