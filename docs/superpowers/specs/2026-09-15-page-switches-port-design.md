# 页面开关功能手动移植设计

## 目标

在当前项目分支中手动复现上游提交 `4ae79d381ea371f297c4be73ae3ad64296a520e3` 的页面开关能力，不使用 merge 或 cherry-pick，并保留当前工作区中与本功能无关的 `src/pages/friends.astro` 修改。

## 范围

- 为音乐、文档列表、归档、关于、图谱页面补充 `siteConfig.pages` 开关及类型定义。
- 页面关闭时返回 404；知识图谱 API 在图谱关闭时返回 404。
- 文档分页关闭时不生成任何静态路径，避免产生跳转存根页。
- 导航栏根据开关隐藏不可用页面，并增加“导航”父菜单及对应多语言文案。
- Sitemap 过滤新增页面开关，同时保留 Bangumi 的已有过滤逻辑。

## 实现方案

1. 更新 `src/types/config.ts` 与 `src/config/siteConfig.ts`，保证配置对象和类型同步。
2. 手动调整 `src/config/navBarConfig.ts`、`src/constants/link-presets.ts`、`src/i18n/i18nKey.ts` 及五种语言文件。
3. 在 `about`、`archive`、`categories`、`list`、`list/[page]`、`music` 页面以及知识图谱 API 中增加开关行为。
4. 在 `astro.config.mjs` 中同步 Sitemap 过滤，并避免移除 Bangumi 过滤。
5. 通过现有导航/配置测试和 Astro 类型检查验证；必要时增加最小契约测试覆盖分页静态路径和 Sitemap 过滤规则。

## 验收标准

- 所有新增配置字段均可被 TypeScript 正确识别。
- 任一新增页面开关关闭后，页面不会正常提供内容，导航不会显示对应入口，Sitemap 不包含对应 URL。
- `postList` 关闭时 `/list/2/` 等分页不生成静态路由。
- `bangumi` 关闭时仍不会进入 Sitemap。
- 现有未提交的 `src/pages/friends.astro` 修改保持不变。
- 相关测试与 `astro check` 通过。
