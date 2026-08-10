/**
 * KaTeX 静态资源复制脚本
 *
 * 将 katex.min.css 及其字体从 node_modules 复制到 public/katex/，
 * 使 KaTeX 样式能以恒定 URL（/katex/katex.min.css）加载。
 *
 * 恒定 URL 的意义：
 * - 与 cssCodeSplit 按页拆出的 hash 文件名不同，URL 不会随构建变化，
 *   浏览器可长期缓存；swup 页面切换时 head diff 不会误判为资源变更。
 * - 样式在文章页延迟加载（media="print" onload 技巧），不阻塞首屏。
 *
 * 用法：node scripts/copy-katex-assets.js
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const SRC_CSS = join(ROOT_DIR, "node_modules", "katex", "dist", "katex.min.css");
const SRC_FONTS = join(ROOT_DIR, "node_modules", "katex", "dist", "fonts");
const DEST_DIR = join(ROOT_DIR, "public", "katex");
const DEST_FONTS = join(DEST_DIR, "fonts");

function copyIfNewer(src, dest) {
	if (!existsSync(src)) return false;
	mkdirSync(dirname(dest), { recursive: true });
	if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) {
		return false; // up to date
	}
	copyFileSync(src, dest);
	return true;
}

function main() {
	if (!existsSync(SRC_CSS)) {
		console.error("copy-katex-assets: katex not installed, skipping");
		return;
	}

	mkdirSync(DEST_FONTS, { recursive: true });

	const copied = [];
	if (copyIfNewer(SRC_CSS, join(DEST_DIR, "katex.min.css"))) {
		copied.push("katex.min.css");
	}

	for (const file of readdirSync(SRC_FONTS)) {
		if (copyIfNewer(join(SRC_FONTS, file), join(DEST_FONTS, file))) {
			copied.push(`fonts/${file}`);
		}
	}

	console.log(
		copied.length > 0
			? `copy-katex-assets: copied ${copied.length} file(s) to public/katex/`
			: "copy-katex-assets: all up to date",
	);
}

main();
