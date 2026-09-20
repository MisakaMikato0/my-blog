import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import I18nKey from "@/i18n/i18nKey";
import { en } from "@/i18n/languages/en";
import { ja } from "@/i18n/languages/ja";
import { ru } from "@/i18n/languages/ru";
import { zh_CN } from "@/i18n/languages/zh_CN";
import { zh_TW } from "@/i18n/languages/zh_TW";

const read = (file: string) => readFileSync(`${process.cwd()}/${file}`, "utf8");

describe("upstream 657a3d0f 选择性迁移契约", () => {
	it("保留本站暗色页面底色，不导入上游 #101010", () => {
		const variables = read("src/styles/variables.styl");
		expect(variables).toContain("--page-bg: #111827");
		expect(variables).not.toMatch(/:root\.dark[\s\S]*--page-bg:\s*#101010/);
	});

	it("暗色 chrome 对齐上游灰阶，并补齐文章表面色", () => {
		const variables = read("src/styles/variables.styl");
		expect(variables).toContain("--navbar-bg: #161616");
		expect(variables).toContain("--article-surface-bg: #161616");
		expect(variables).toContain("--article-surface-bg: #F5F5F5");
		expect(variables).toContain("--strong-color: #dadada");
		expect(variables).toContain("--link-color: oklch(0.80 0.12 210)");
	});

	it("页脚暗色仍用本站渐变，不改成上游扁平 #171717", () => {
		const footer = read("src/styles/components/footer.css");
		expect(footer).toContain("#101827");
		expect(footer).toContain("#111827");
		expect(footer).toContain("#0d1421");
		expect(footer).not.toMatch(
			/:root\.dark \.site-footer \{[\s\S]*background:\s*#171717;/,
		);
	});

	it("五种语言都有上下篇文案", () => {
		expect(en[I18nKey.prevPost]).toBe("Previous post");
		expect(en[I18nKey.nextPost]).toBe("Next post");
		expect(zh_CN[I18nKey.prevPost]).toBe("上一篇");
		expect(zh_CN[I18nKey.nextPost]).toBe("下一篇");
		expect(zh_TW[I18nKey.prevPost]).toBe("上一篇");
		expect(zh_TW[I18nKey.nextPost]).toBe("下一篇");
		expect(ja[I18nKey.prevPost]).toBe("前の記事");
		expect(ja[I18nKey.nextPost]).toBe("次の記事");
		expect(ru[I18nKey.prevPost]).toBe("Предыдущая статья");
		expect(ru[I18nKey.nextPost]).toBe("Следующая статья");
	});

	it("文章页左卡是上一篇 prevSlug，并带 prevPost 文案", () => {
		const source = read("src/pages/posts/[...slug].astro");
		expect(source).toContain("post-pager-row");
		expect(source).toContain("I18nKey.prevPost");
		expect(source).toContain("I18nKey.nextPost");
		const rowStart = source.indexOf("post-pager-row");
		const firstAnchor = source.indexOf("<a", rowStart);
		const secondAnchor = source.indexOf("<a", firstAnchor + 1);
		const leftCard = source.slice(firstAnchor, secondAnchor);
		expect(leftCard).toContain("entry.data.prevSlug");
		expect(leftCard).not.toContain("entry.data.nextSlug");
		expect(leftCard).toContain("I18nKey.prevPost");
	});

	it("Mermaid 暗色用 DARK_THEME_ROLES，不再滤镜 svg", () => {
		expect(read("src/plugins/rehype-mermaid.mjs")).toContain(
			"DARK_THEME_ROLES",
		);
		expect(read("src/styles/markdown-extend.styl")).not.toContain(
			"filter: brightness(0.9) contrast(1.1)",
		);
	});

	it("文章列加宽到 55rem，并去掉 markdown 标题装饰", () => {
		const markdown = read("src/styles/markdown.css");
		expect(markdown).toContain(".post-pager-row");
		expect(markdown).toContain("width: min(55rem, 100%)");
		expect(markdown).toContain("width: min(calc(55rem + 1.5rem), 100%)");
		expect(markdown).not.toContain("width: 3.5rem");
		expect(markdown).not.toContain("background: var(--md-heading-accent)");
		const postHero = read("src/styles/components/post-hero.css");
		const heroBlock = postHero.match(/\.post-hero \{[^}]*\}/);
		expect(heroBlock?.[0]).toBeDefined();
		expect(heroBlock?.[0]).not.toMatch(/width:\s*100%/);
	});

	it("代码块折叠改成省略号和查看更多", () => {
		const css = read("src/styles/expressive-code.css");
		expect(css).toContain('content: "•••"');
		expect(css).toContain('content: "查看更多"');
		expect(css).toContain("--code-block-accent");
	});

	it("FloatingDock 有 TOC 按钮，隐藏条件用本地面板断点", () => {
		const dock = read("src/components/controls/FloatingDock.astro");
		expect(dock).toContain("dock-toc-btn");
		expect(dock).toContain("dock-drawer-toc");
		expect(dock).toContain(
			"(min-width: 104rem) and (hover: hover) and (pointer: fine)",
		);
		expect(dock).not.toContain("(min-width: 96rem)");
		expect(read("src/styles/components/floating-dock.css")).toContain(
			".dock-drawer-toc .dock-toc-scroll",
		);
	});

	it("评论区标题改成胶囊竖条和隐私政策按钮", () => {
		const comment = read("src/components/comment/index.astro");
		expect(comment).toContain("bg-[#00a29b]");
		expect(comment).toContain("Key.privacyPolicy");
		expect(comment).toContain("window.openPrivacyModal");
	});

	it("大纲停靠冻结进度和当前标题", () => {
		const controller = read("src/utils/article-toc-panel-controller.ts");
		expect(controller).toContain("getEffectiveScrollY");
		expect(controller).toContain("dockScrollY");
		expect(controller).toContain("this.dockScrollY = null");
	});

	it("TOC 面板定位仍禁止 28.25rem", () => {
		expect(read("src/styles/components/article-toc-panel.css")).not.toContain(
			"28.25rem",
		);
	});

	it("暗色 hero 舞台跟随保留的页面底色", () => {
		expect(read("src/styles/components/home-hero.css")).toContain(
			"--home-hero-surface: var(--page-bg);",
		);
	});

	it("不引入上游 outline-rail 文件", () => {
		expect(read("src/components/controls/FloatingDock.astro")).not.toContain(
			"article-outline-controller",
		);
	});
});
