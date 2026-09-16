/**
 * 文章 TOC 树：标题采集 + 层级归一化，纯数据模块。
 * 右侧大纲面板（article-toc-panel-controller）与思维导图弹窗共用这一份结构。
 */

export const TOC_HEADING_SELECTOR = "h1, h2, h3";

export interface TocNode {
	index: number;
	level: number;
	depth: number;
	text: string;
	id: string | null;
	element: HTMLElement;
	parent: number;
	children: number[];
	subtreeStart: number;
	subtreeEnd: number;
}

export interface TocTree {
	title: string;
	titleElement: HTMLElement | null;
	nodes: TocNode[];
	maxLevel: number;
}

function getHeadingText(heading: HTMLElement): string {
	const clone = heading.cloneNode(true) as HTMLElement;
	clone
		.querySelectorAll(
			"script, style, .anchor, .anchor-icon, [data-pagefind-ignore]",
		)
		.forEach((element) => element.remove());

	const text = clone.textContent?.replace(/#+\s*$/, "").trim();
	return text || heading.getAttribute("aria-label") || heading.id || "Heading";
}

export function collectTocTree(): TocTree | null {
	const content =
		document.querySelector(".custom-md") ??
		document.querySelector(".prose") ??
		document.querySelector(".markdown-content");
	if (!content) return null;

	const elements = Array.from(
		content.querySelectorAll<HTMLElement>(TOC_HEADING_SELECTOR),
	);
	if (elements.length === 0) return null;

	const titleElement = document.querySelector<HTMLElement>(".post-hero__title");
	const title = titleElement?.textContent?.trim() || "";
	const nodes: TocNode[] = [];
	const stack: number[] = [];

	for (const element of elements) {
		const depth = Number.parseInt(element.tagName.slice(1), 10);
		while (stack.length > 0 && nodes[stack[stack.length - 1]].depth >= depth) {
			stack.pop();
		}
		const parent = stack.length > 0 ? stack[stack.length - 1] : -1;
		const node: TocNode = {
			index: nodes.length,
			level: stack.length + 1,
			depth,
			text: getHeadingText(element),
			id: element.id || null,
			element,
			parent,
			children: [],
			subtreeStart: nodes.length,
			subtreeEnd: nodes.length,
		};
		if (parent >= 0) nodes[parent].children.push(node.index);
		nodes.push(node);
		stack.push(node.index);
	}

	for (let i = nodes.length - 1; i >= 0; i -= 1) {
		const node = nodes[i];
		if (node.parent < 0) continue;
		const parentNode = nodes[node.parent];
		parentNode.subtreeStart = Math.min(parentNode.subtreeStart, node.subtreeStart);
		parentNode.subtreeEnd = Math.max(parentNode.subtreeEnd, node.subtreeEnd);
	}

	return {
		title,
		titleElement,
		nodes,
		maxLevel: nodes.reduce((max, node) => Math.max(max, node.level), 1),
	};
}
