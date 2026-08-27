# Wiki 与 AI 搜索选择性迁移设计

## 背景

上游提交 baeb1d1451e08c04d0f0ac62c608e3ceadbe2c9e 删除了博客内置的 AI 搜索，并新增面向 AI/爬虫的机器可读 Wiki 接口。当前分支已经包含后续首页、404 和交互改动，因此不直接 cherry-pick 整个上游提交，而是选择性移植目标能力。

本次只移除 AI 搜索相关实现，保留项目中其他 Cloudflare Worker 功能，包括 divination、dynamic、gallery 和 github-contributions。

## 目标

1. 新增静态 Wiki 机器入口：
   - /wiki/index.json
   - /wiki/articles/:slug.json
   - /wiki/articles/:slug.md
2. Wiki 只暴露公开文章，排除草稿、密码文章和 wikiExclude: true 文章。
3. 删除 AI 搜索的前端、服务端、Worker、配置、类型、样式和专用脚本。
4. 保留普通 Pagefind 搜索和非 AI Cloudflare Worker 能力。
5. 不进行完整的静态部署改造，不删除 functions/_worker.ts、scripts/build-worker.mjs 或其他 Worker 配置。

## 非目标

- 不改变普通文章页面的渲染方式。
- 不改变首页、404、日历、画廊、占卜等非 AI 功能。
- 不引入运行时 LLM 调用；Wiki 内容来自已有文章，在 Astro 构建阶段生成静态文件。
- 不迁移上游提交中与本次范围无关的部署配置、依赖升级或首页改动。

## 设计

### Wiki 数据层

新增 src/utils/llm-wiki.ts，集中处理 Wiki 数据转换：

- 复用现有文章 collection 查询能力。
- 通过 isPublicWikiPost 过滤 draft、password 和 wikiExclude。
- 将文章转换为统一的摘要对象和完整文章对象。
- 生成文章标题、描述、发布时间、更新时间、分类、标签、标准 URL、JSON URL 和 Markdown URL。
- 解析 Markdown 一级及以上标题，生成章节、标题列表、GitHub 风格 slug 和摘要。
- 提供统一的 JSON/Markdown Response 创建函数，并设置正确的内容类型和缓存头。

### 静态路由

新增三个 Astro API 路由，全部设置 prerender = true：

- src/pages/wiki/index.json.ts：返回 Wiki 索引。
- src/pages/wiki/articles/[...slug].json.ts：返回单篇完整 Wiki JSON。
- src/pages/wiki/articles/[...slug].md.ts：返回带 frontmatter 的单篇 Markdown。

动态文章路由通过 getStaticPaths 从公开文章列表生成路径，并通过 props 传递文章数据，避免请求时重新查找文章。

### AI 搜索清理

删除以下 AI 搜索专属模块：

    src/components/controls/ai-search/
    src/server/ai-search/
    src/workers/cloudflare/ai-search/
    src/config/aiSearchConfig.ts
    src/types/ai-search.ts
    src/styles/components/ai-search.css
    scripts/ai-search/
    src/worker.ts

同步清理 AI 搜索在以下位置的引用：

- FloatingDock
- MobileDock
- SearchModal
- Astro 配置中的开发代理和 AI 搜索专用分包配置
- AI 搜索相关国际化文案、图标和全局类型声明
- package.json 中仅用于 AI 搜索的脚本和依赖
- functions/_worker.ts 中 AI 搜索运行时的 import 和 /api/ai-chat 路由

保留 functions/_worker.ts 本身以及其中 divination、dynamic、gallery 和 github-contributions 的路由。由于这些功能仍使用 Cloudflare Worker，@cloudflare/* 类型/测试依赖、wrangler 和 scripts/build-worker.mjs 不能因为本次清理被删除。

普通搜索入口和 Pagefind 逻辑必须保留。非 AI Worker 目录及其调用关系不得被删除。

### 兼容与边界

- Wiki 工具应适配当前分支的文章 schema 和文章目录结构，不假定当前分支与上游提交完全一致。
- 现有文章内容中的历史技术说明可以保留，不把文章正文中的文字引用误判为运行时代码依赖。
- 如果当前分支的 siteConfig.site_url 或 Astro site 类型与上游不同，以当前项目类型为准。
- Wiki 入口需要加入 sitemap 自定义页面（如当前 sitemap 配置支持），但不改变已有页面过滤规则。

## 数据流

    文章 collection
        -> getWikiPosts()
        -> 过滤公开文章
        -> createWikiIndex() / toWikiArticle()
        -> Astro prerender
        -> dist/wiki/index.json
        -> dist/wiki/articles/<slug>.json
        -> dist/wiki/articles/<slug>.md

AI 搜索清理后的数据流为：

    用户搜索
        -> 普通 SearchModal
        -> Pagefind

## 错误处理

- 未进入 getStaticPaths 的草稿、密码文章和 wikiExclude 文章不会生成 Wiki 路由。
- Wiki 响应统一使用明确的 Content-Type。
- URL 统一基于 Astro site 或现有 siteConfig.site_url 生成，避免出现相对 URL 或环境不一致。
- 不新增运行时错误处理或 Worker fallback，因为 Wiki 是构建期静态输出。

## 测试与验收

实现遵循先测试后代码：

1. 为 Wiki 过滤逻辑、索引转换、章节解析和 Markdown frontmatter 添加单元测试。
2. 先运行测试确认新增测试失败。
3. 实现最小代码使测试通过。
4. 验证 AI 搜索目录和引用清理结果。
5. 验证非 AI Worker 文件仍存在且未被意外改动。
6. 运行：

       pnpm check
       pnpm type-check
       pnpm test
       pnpm build

验收标准：构建成功，生成三个 Wiki 入口类型的静态文件；普通搜索和非 AI Worker 相关测试不回归；AI 搜索专属代码与引用已清理。

## 实施策略

采用选择性移植上游提交的方式，不执行整提交 cherry-pick：

1. 先建立测试和当前分支兼容的 Wiki 数据接口。
2. 新增 Wiki 路由并接入 sitemap。
3. 删除 AI 搜索代码和引用。
4. 只清理 AI 搜索专属依赖和脚本，不动非 AI Worker 构建链。
5. 使用类型检查、测试和构建验证结果。

