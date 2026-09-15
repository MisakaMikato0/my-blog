# 页面开关功能手动移植 Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Each step uses checkbox syntax.

Goal: 在当前 master 分支手动复现上游提交 4ae79d381ea371f297c4be73ae3ad64296a520e3 的页面开关能力，同时保留当前分支已有的工具、爱好、动态、书籍和卜筮导航能力。

Architecture: 页面开关继续由 siteConfig.pages 作为唯一配置源；页面前置重定向、静态路径生成和 Sitemap 过滤分别在 Astro 页面、getStaticPaths 与 astro.config.mjs 中执行。导航配置在现有菜单结构上加入目标提交的“导航”父菜单，并对新增页面入口按开关动态构建。

Tech Stack: Astro 7、TypeScript、Astro Sitemap、Vitest、pnpm。

## Global Constraints

- 不执行 git merge、git cherry-pick 或直接套用上游提交。
- 保留当前未提交的 src/pages/friends.astro 修改。
- 新增页面开关必须同时影响页面访问、导航显示和 Sitemap。
- postList 关闭时分页 getStaticPaths 必须返回空数组，不生成跳转存根页。
- 保留 bangumi 的 Sitemap 过滤逻辑。

---

## 文件结构与职责

- src/types/config.ts：页面开关字段、导航预设枚举、导航链接激活前缀类型。
- src/config/siteConfig.ts：新增页面开关默认值。
- src/config/navBarConfig.ts：按开关构建导航菜单，保留当前分支菜单。
- src/constants/link-presets.ts：新增“导航”父菜单元数据。
- src/i18n/i18nKey.ts 与 src/i18n/languages/*.ts：新增 navLinks 翻译。
- src/pages/*.astro 与 src/pages/api/knowledge-graph.json.ts：页面和 API 访问开关。
- src/pages/list/[page].astro：关闭时阻止分页静态路径生成。
- astro.config.mjs：Sitemap 过滤。
- src/components/layout/DropdownMenu.astro：输出 activePathPrefixes。
- src/config/tools-nav.test.ts 与 src/page-switches.contract.test.ts：导航和页面开关契约测试。

### Task 1: 先写页面开关与导航的失败契约测试

Files:
- Modify: src/config/tools-nav.test.ts
- Create: src/page-switches.contract.test.ts

Interfaces:
- 测试读取真实 siteConfig、navBarConfig、LinkPresets 和源文件，不使用生产代码 mock。

- [ ] Step 1: 更新导航测试

让现有测试定位 LinkPreset.NavLinks，期望启用 collections 时子项为 [LinkPreset.Feibichi, LinkPreset.Collections]，父菜单名称为“导航”，并确认 Feibichi 与 Collections 不再位于顶层。保留外链 URL 行为断言。

- [ ] Step 2: 新增失败契约测试

创建 src/page-switches.contract.test.ts，加入以下测试行为：

    import { readFileSync } from "node:fs";
    import { describe, expect, it } from "vitest";
    import { siteConfig } from "@/config";

    const read = (file: string) => readFileSync(process.cwd() + "/" + file, "utf8");

    describe("page switch port", () => {
      it("declares the five migrated page switches", () => {
        expect(siteConfig.pages).toMatchObject({
          music: true,
          postList: true,
          archive: true,
          about: true,
          categories: true,
        });
      });

      it("guards migrated pages and the graph API", () => {
        for (const file of [
          "src/pages/about.astro",
          "src/pages/archive.astro",
          "src/pages/categories.astro",
          "src/pages/list.astro",
          "src/pages/music.astro",
        ]) {
          expect(read(file)).toContain('Astro.redirect("/404/")');
        }
        expect(read("src/pages/api/knowledge-graph.json.ts")).toContain("status: 404");
      });

      it("prevents disabled paginated paths and filters migrated routes", () => {
        expect(read("src/pages/list/[page].astro")).toContain(
          "if (!siteConfig.pages.postList) {",
        );
        const config = read("astro.config.mjs");
        for (const route of [
          "/list/", "/music/", "/archive/", "/about/",
          "/categories/", "/collections/",
        ]) {
          expect(config).toContain(route);
        }
        expect(config).toContain('pathname === "/bangumi/"');
      });
    });

- [ ] Step 3: 运行测试确认确实失败

Run: pnpm vitest run src/config/tools-nav.test.ts src/page-switches.contract.test.ts

Expected: 因 NavLinks、五个页面字段和页面守卫尚未实现而失败；确认失败原因正确后再写生产代码。

### Task 2: 添加类型、配置和多语言基础

Files:
- Modify: src/types/config.ts
- Modify: src/config/siteConfig.ts
- Modify: src/constants/link-presets.ts
- Modify: src/i18n/i18nKey.ts
- Modify: src/i18n/languages/en.ts
- Modify: src/i18n/languages/ja.ts
- Modify: src/i18n/languages/ru.ts
- Modify: src/i18n/languages/zh_CN.ts
- Modify: src/i18n/languages/zh_TW.ts

Interfaces:
- SiteConfig.pages 增加 music、postList、archive、about、categories 五个 boolean 字段。
- LinkPreset.NavLinks 追加为新枚举成员，不重排现有枚举值。
- NavBarLink 增加 activePathPrefixes?: string[]，因为 Navbar 已读取对应 data 属性。

- [ ] Step 1: 增加五个开关并设为 true

在 SiteConfig.pages 类型和 siteConfig.pages 配置中增加五个字段，保留当前分支已有的 friends、dynamic、bangumi、books、divination 等字段和值。

- [ ] Step 2: 增加 navLinks 文案和预设

I18nKey 增加 navLinks = "navLinks"；五种翻译依次使用 Links、リンク、Навигация、导航、導航。LinkPresets 增加：

    [LinkPreset.NavLinks]: {
      name: i18n(I18nKey.navLinks),
      url: "/collections/",
      icon: "material-symbols:explore",
    },

将 NavLinks 追加到 LinkPreset 末尾，避免改变现有数字值。

- [ ] Step 3: 运行 focused tests

Run: pnpm vitest run src/config/tools-nav.test.ts src/page-switches.contract.test.ts

Expected: 配置和文案相关断言通过；导航仍可能失败，直到 Task 3 使用 NavLinks。

### Task 3: 条件化重建导航，同时保留当前菜单

Files:
- Modify: src/config/navBarConfig.ts
- Modify: src/components/layout/DropdownMenu.astro
- Modify: src/config/tools-nav.test.ts

Interfaces:
- navBarConfig.links 继续使用 (NavBarLink | LinkPreset)[]。
- 当前 NavTools、Hobby、Dynamic、Books、Divination、QQGroup 等入口不因本次移植被删除。

- [ ] Step 1: 将现有工具组改为导航组

用 LinkPresets[LinkPreset.NavLinks] 替换当前 toolsNav 父项，并按目标顺序构建：

    const linksChildren: (NavBarLink | LinkPreset)[] = [LinkPreset.Feibichi];
    if (siteConfig.pages.collections) {
      linksChildren.push(LinkPreset.Collections);
    }
    const linksNav: NavBarLink = {
      ...LinkPresets[LinkPreset.NavLinks],
      children: linksChildren,
    };

在原 toolsNav 位置使用 linksNav，确保不会同时渲染两个重复入口。

- [ ] Step 2: 给目标页面入口加开关

文章菜单仅在 postList、archive、categories 对应开关开启时加入子项，三个都关闭时不渲染父菜单。当前 myChildren 中对 Music 和 About 增加开关，全部关闭时不渲染父菜单。保留联系我、爱好及其现有开关逻辑。

- [ ] Step 3: 保留文章页菜单激活状态

文章父菜单设置 activePathPrefixes: ["/posts/"]。在 DropdownMenu.astro 的外层 dropdown-container 输出：

    data-active-path-prefixes={processedLink.activePathPrefixes?.join(" ")}

这样 Navbar 现有脚本会在 /posts/... 页面激活文章菜单。

- [ ] Step 4: 运行 focused tests

Run: pnpm vitest run src/config/tools-nav.test.ts src/page-switches.contract.test.ts

Expected: focused tests 全部通过。

### Task 4: 增加页面、API、静态路径和 Sitemap 控制

Files:
- Modify: src/pages/about.astro
- Modify: src/pages/archive.astro
- Modify: src/pages/categories.astro
- Modify: src/pages/list.astro
- Modify: src/pages/list/[page].astro
- Modify: src/pages/music.astro
- Modify: src/pages/api/knowledge-graph.json.ts
- Modify: astro.config.mjs

Interfaces:
- 关闭页面返回 Astro.redirect("/404/")。
- 关闭图谱 API 返回 new Response("Not Found", { status: 404 })。
- 关闭文档分页从 getStaticPaths 返回 []。

- [ ] Step 1: 增加页面守卫

在目标页面导入 siteConfig，并在数据读取前添加：

    if (!siteConfig.pages.about) return Astro.redirect("/404/");
    if (!siteConfig.pages.archive) return Astro.redirect("/404/");
    if (!siteConfig.pages.categories) return Astro.redirect("/404/");
    if (!siteConfig.pages.postList) return Astro.redirect("/404/");
    if (!siteConfig.pages.music) return Astro.redirect("/404/");

分别在 about、archive、categories、list、music 页面使用对应字段。

- [ ] Step 2: 阻止分页静态路径生成

在 src/pages/list/[page].astro 的 getStaticPaths 开头、getSortedPosts 之前增加：

    if (!siteConfig.pages.postList) {
      return [];
    }

保留文件后面的页面级重定向，兼容非静态/服务端渲染。

- [ ] Step 3: 保护图谱 API

导入 siteConfig，在调用 getKnowledgeGraphData 前检查 categories，关闭时返回 404 Response。

- [ ] Step 4: 扩展 Sitemap 过滤

保留现有 /search/、/friends/、/sponsor/、/guestbook/、/bangumi/、/gallery/、/dynamic/ 过滤。新增 /music/、/archive/、/about/、/categories/、/collections/ 的精确过滤，以及关闭 postList 时对 /list/ 前缀的过滤。

- [ ] Step 5: 运行 focused tests 和 Astro 检查

Run: pnpm vitest run src/config/tools-nav.test.ts src/page-switches.contract.test.ts src/astro-config-wiki.test.ts

Then run: pnpm exec astro check

Expected: focused tests 和 Astro check 通过。

### Task 5: 全量验证与范围检查

Files:
- Verify only; 不应再新增与功能无关的文件。

- [ ] Step 1: 检查 diff 和无关修改

Run: git status --short; git diff --stat; git diff -- src/pages/friends.astro

确认 friends.astro 原有样式导入修改仍在，且没有生成物被修改。

- [ ] Step 2: 运行全量测试

Run: pnpm test

Expected: exit code 0，所有测试通过。

- [ ] Step 3: 运行 TypeScript 检查

Run: pnpm type-check

Expected: exit code 0。

- [ ] Step 4: 复核手动移植边界

确认未使用 merge 或 cherry-pick，最终差异包含目标提交功能及已确认的分页生成、Bangumi Sitemap 两项修复。

- [ ] Step 5: 仅在用户明确要求时提交功能代码

不要自动创建功能提交。若用户要求提交，只 stage 实现与测试文件，使用类似 feat(config): 完善页面开关与导航过滤 的提交信息。
