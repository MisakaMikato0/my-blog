/**
 * 压缩塔罗牌图片：JPG → WebP（缩放到 2x 显示尺寸，质量 80）
 *
 * 背景：78 张 Rider-Waite 牌面原始为 JPG（457x800，共约 9.3MB），
 * 页面显示尺寸为 180x315（2x 即 360x630），直接转 WebP 可减少约 70% 体积。
 * 转换完成后删除原 JPG，避免仓库体积膨胀。
 *
 * 用法：node scripts/optimize-tarot-assets.mjs
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAROT_DIR = path.join(ROOT, "public", "images", "tarot");

// 显示尺寸 180x315，输出 2x 分辨率（360x630 以内）
const MAX_WIDTH = 360;
const MAX_HEIGHT = 630;
const WEBP_QUALITY = 80;

let totalBefore = 0;
let totalAfter = 0;
let converted = 0;

const files = readdirSync(TAROT_DIR)
	.filter((f) => f.endsWith(".jpg"))
	.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

for (const file of files) {
	const inputPath = path.join(TAROT_DIR, file);
	const outputPath = path.join(TAROT_DIR, file.replace(/\.jpg$/, ".webp"));
	const before = statSync(inputPath).size;
	totalBefore += before;

	await sharp(inputPath)
		.resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
		.webp({ quality: WEBP_QUALITY })
		.toFile(outputPath);

	const after = statSync(outputPath).size;
	totalAfter += after;
	converted++;
	console.log(
		`✓ ${file} → ${path.basename(outputPath)}  (${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB)`,
	);

	// 删除原 JPG
	rmSync(inputPath);
}

console.log(`\n完成：${converted}/${files.length} 张`);
console.log(
	`体积：${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB（节省 ${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%）`,
);
