# HomeBlinds Stage 适配设计

## 目标

将上游提交 `fc2dbe77f6d367631063c42ee051fc8d27abe902` 及其前置提交中与 HomeBlinds 功能相关的完整代码迁入博客，但只替换首页 `HomeDisplayLayer` 内的作品展示 stage。现有 `HomeDisplayLayer` 外层、viewport、滚动占位、其它动画节点和下方内容保持不变。

## 范围

- 在现有 `div.home-display-layer__stage[data-display-stage]` 内渲染 HomeBlinds 的揭示层、横向场景、五套场景版式、场景装饰、立牌、20 格电池进度和运行时配置。
- 迁入 HomeBlinds 所需的组件、控制器、样式、类型、配置和 `public/assets/images/home-blinds/**` 图片资源。
- 保留现有 `HomeDisplayLayer` 的 portfolio shutter DOM 与 GSAP 逻辑，不修改其下方内容。
- 桌面端启用 HomeBlinds；移动端及 `prefers-reduced-motion` 使用既有隐藏/降级策略。

不迁入上游提交中与 HomeBlinds 无关的文章、友链、其它首页或资源改动。

## 结构设计

`HomeDisplayLayer.astro` 继续作为唯一外层容器。目标 stage 保持 `data-display-stage`，其子树改为可嵌入的 HomeBlinds stage 结构。HomeBlinds 组件不输出独立的固定根节点，不创建新的页面滚动占位，也不改变 stage 以外的 DOM。

HomeBlinds 继续使用上游的数据属性和场景子组件，以保留完整的五种场景动画、装饰和进度 UI。运行时配置通过 Astro 序列化注入，避免控制器依赖全局隐式状态。

## 控制器适配

控制器增加 stage/root 注入入口：初始化时接收现有 `data-display-stage` 和 `data-display-viewport`，查询范围限制在 HomeBlinds 子树内。它复用外层页面已有的滚动生命周期，不创建独立的同级 HomeBlinds 页面区段。

原有展示层文字节点查询和时间线不再操作 HomeBlinds 内部节点。portfolio shutter 仍按原有选择器和时间线运行，保证 stage 替换不会影响后续内容。

清理函数必须撤销 GSAP context、ScrollTrigger、事件监听、计时器和动态媒体状态。初始化仅在桌面端且功能启用时执行；移动端和 reduced-motion 不初始化桌面交互控制器。

## 配置与类型

在 `HomeConfig` 中加入 `homeBlinds` 配置，包含揭示层、headline、场景滚动距离、背景循环图、复合首幕、最多四张场景图和立牌图。保留现有 `displayLayer` 与 `portfolioShutter` 配置，因为外层和后续 portfolio shutter 仍然使用它们。

## 资源策略

只复制上游 HomeBlinds 使用的 `/public/assets/images/home-blinds/**` 资源。配置中的资源路径保持以 `/assets/images/home-blinds/` 开头，确保静态构建后的路径稳定。

## 验证标准

1. 目标 stage 含有 HomeBlinds 的完整结构，HomeDisplayLayer 外层和下方 portfolio shutter 结构未被删除。
2. TypeScript 检查通过，或明确区分本次改动与已有错误。
3. 生产构建通过。
4. 桌面端滚动时揭示层、横向场景、装饰动画和电池进度正常；移动端不显示桌面 HomeBlinds；reduced-motion 不启动桌面滚动动画。
5. 未修改其它首页模块的行为或内容。

