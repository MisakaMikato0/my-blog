# 工具导航栏下拉菜单设计

## 目标

在顶部导航栏新增“工具”一级菜单，并将现有的“工具导航”和“THBWiki”调整为其二级菜单项。保留两项当前链接地址、外链行为和页面内容，不新增工具落地页。

## 方案

复用现有 `NavBarLink.children` 下拉菜单机制，新增一个名为“工具”的导航配置项：

```text
主页 → 工具
          ├─ 工具导航
          └─ THBWiki
     → 文章 → 爱好 → 联系我 → 我的
```

“工具导航”仍指向 `/collections/`，仅在 `siteConfig.pages.collections` 开启时显示；`THBWiki` 继续使用现有外部链接并在新窗口打开。工具菜单本身仅作为下拉触发器，不新增 `/tools/` 路由。

## 实现范围

- 在 `LinkPreset` 与 `LinkPresets` 中新增“工具”菜单项及多语言名称。
- 在 `navBarConfig` 中将 `Collections` 与 `Feibichi` 从一级导航移入“工具”菜单的 `children`。
- 保持现有桌面端 `DropdownMenu` 和移动端 `NavMenuPanel` 不变；两者继续从同一份导航配置渲染。
- 增加导航配置测试，验证“工具”是一级菜单，且两个目标项位于其下方，未重复出现在一级导航。

## 验证标准

1. TypeScript 类型检查与导航相关测试通过。
2. 桌面端显示“工具”下拉菜单，菜单内依次为“工具导航”“THBWiki”。
3. 移动端菜单显示相同层级和顺序。
4. `/collections/` 与 THBWiki 外链地址保持不变。

