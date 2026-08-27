# 404 动态楼梯场景设计

## 目标

将上游提交 403f59b3dc1fc7a9e2abee79ca5b74be59c66057 的 404 动态楼梯交互场景合入当前博客，替换当前静态卡片式 404 页面。

## 方案

以该上游提交在 2026 年 8 月 23 日的实现作为目标版本，覆盖以下文件：

- src/pages/404.astro：页面结构、无障碍属性、Astro 页面切换生命周期。
- src/styles/main.css：JetBrains Mono 字体引入。
- src/styles/pages/404.css：动态场景和响应式布局样式。
- src/utils/not-found-scene.ts：Canvas 楼梯绘制、数字物理动画、碰撞和生命周期管理。
- src/constants/icons.ts：以目标提交版本为准，解决当前未提交图标表修改冲突。

当前工作区除 src/constants/icons.ts 外不应被主动修改。合入不创建新的 Git commit，结果留在工作区供检查。

## 交互与兼容性

- 桌面端和移动端使用不同的场景几何参数、数字尺寸、生成数量和速度。
- prefers-reduced-motion: reduce 时不启动动画。
- 页面不可见、窗口尺寸、主题或 Astro 页面生命周期变化时正确暂停、重绘和清理资源。
- 页面仍使用现有国际化文案、首页/归档链接和站点布局。

## 验证

- 确认目标文件内容与上游提交一致。
- 运行 pnpm exec astro check。
- 运行 pnpm exec tsc --noEmit。
- 运行 pnpm test，确认现有测试没有回归。
- 如静态检查通过，再运行 pnpm exec astro build；构建脚本可能包含缩略图和站点生成步骤，若受环境影响失败，记录确切失败原因。
