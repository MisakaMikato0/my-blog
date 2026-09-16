import { describe, expect, it } from "vitest";
import { collectTocTree } from "@utils/article-toc-tree";

describe("文章 TOC 树", () => {
	it("将 h2 → h3 → h2 归一化为同层根节点和子节点", () => {
		document.body.innerHTML = 
			`<article>
				<h1 class="post-hero__title">文章标题</h1>
				<div class="custom-md">
					<h2 id="intro">介绍</h2>
					<h3 id="detail">细节 <span class="anchor-icon">#</span></h3>
					<h2>结论</h2>
				</div>
			</article>`;

		const tree = collectTocTree();

		expect(tree).not.toBeNull();
		expect(tree?.title).toBe("文章标题");
		expect(tree?.nodes.map((node) => node.parent)).toEqual([-1, 0, -1]);
		expect(tree?.nodes.map((node) => node.level)).toEqual([1, 2, 1]);
		expect(tree?.nodes[1].text).toBe("细节");
		expect(tree?.nodes[0].subtreeEnd).toBe(1);
		expect(tree?.maxLevel).toBe(2);
	});

	it("没有标题或正文容器时返回 null", () => {
		document.body.innerHTML = "<main><p>没有标题</p></main>";
		expect(collectTocTree()).toBeNull();
	});
});
