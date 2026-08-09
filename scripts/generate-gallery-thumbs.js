/**
 * 图库缩略图生成脚本
 *
 * 扫描 public/gallery/{albumId}/ 下的图片，为每张生成宽度上限 640px 的
 * WebP 缩略图，输出到 public/gallery/.thumbs/{albumId}/{filename}.webp。
 * 已存在且比原图新的缩略图会跳过（增量构建）。
 *
 * 缩略图仅用于列表/瀑布流展示，点击放大仍使用原图（fancybox data-src）。
 *
 * 用法：node scripts/generate-gallery-thumbs.js
 */

import { readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const GALLERY_DIR = join(ROOT_DIR, "public", "gallery");
const THUMBS_DIR = join(GALLERY_DIR, ".thumbs");

/** 缩略图最大宽度（px）。图库列宽约 240-400px，640px 足够覆盖 2x 屏。 */
const THUMB_MAX_WIDTH = 640;
const THUMB_QUALITY = 75;

const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

function listAlbums() {
	return readdirSync(GALLERY_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name);
}

function listImages(albumId) {
	const dir = join(GALLERY_DIR, albumId);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((name) => IMAGE_RE.test(name))
		.sort();
}

async function generateThumb(albumId, filename) {
	const srcPath = join(GALLERY_DIR, albumId, filename);
	const thumbDir = join(THUMBS_DIR, albumId);
	const thumbName = `${basename(filename, extname(filename))}.webp`;
	const thumbPath = join(thumbDir, thumbName);

	mkdirSync(thumbDir, { recursive: true });

	const srcStat = statSync(srcPath);
	if (existsSync(thumbPath)) {
		const thumbStat = statSync(thumbPath);
		if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
			return { skipped: true };
		}
	}

	await sharp(srcPath)
		.resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
		.webp({ quality: THUMB_QUALITY })
		.toFile(thumbPath);

	const before = srcStat.size;
	const after = statSync(thumbPath).size;
	return { skipped: false, before, after };
}

async function main() {
	const albums = listAlbums();
	if (albums.length === 0) {
		console.log("gallery-thumbs: no albums found under public/gallery/");
		return;
	}

	let totalBefore = 0;
	let totalAfter = 0;
	let generated = 0;
	let skipped = 0;

	for (const albumId of albums) {
		const images = listImages(albumId);
		for (const filename of images) {
			const result = await generateThumb(albumId, filename);
			if (result.skipped) {
				skipped++;
				continue;
			}
			generated++;
			totalBefore += result.before;
			totalAfter += result.after;
			console.log(
				`  [${albumId}] ${filename} -> ${(result.after / 1024).toFixed(1)}KB`,
			);
		}
	}

	const savedPct =
		totalBefore > 0
			? (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)
			: "0.0";
	console.log(
		`gallery-thumbs: ${generated} generated, ${skipped} skipped. ` +
			`${(totalBefore / 1024 / 1024).toFixed(2)}MB -> ` +
			`${(totalAfter / 1024 / 1024).toFixed(2)}MB (-${savedPct}%)`,
	);
}

main().catch((err) => {
	console.error("gallery-thumbs error:", err);
	process.exitCode = 1;
});
