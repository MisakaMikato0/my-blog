import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = fs.readFileSync(
	path.resolve(process.cwd(), "src/styles/pages/article-list.css"),
	"utf8",
);

describe("文章列表布局切换样式契约", () => {
	it("在其他 CSS 规则之前导入骷髅切换按钮样式", () => {
		const importPosition = stylesheet.indexOf(
			"@import '../components/skull-switch.css';",
		);
		const firstRulePosition = stylesheet.indexOf(".article-list");

		expect(importPosition).toBeGreaterThanOrEqual(0);
		expect(firstRulePosition).toBeGreaterThan(importPosition);
	});
});
