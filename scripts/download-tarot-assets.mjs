/**
 * 下载 Rider-Waite 塔罗牌图片（公有领域，来源 JulianDF/tarot-deck-assets）
 * 文件 00.jpg ~ 77.jpg 对应 mingyu-core tarotCards 的 number-1（愚者=0 … 星币国王=77）
 * 下载后自动压缩为 WebP（2x 显示尺寸，质量 80），删除原始 JPG，避免仓库体积膨胀。
 * 目标目录：public/images/tarot/
 *
 * 用法：node scripts/download-tarot-assets.mjs
 */
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "images", "tarot");
const BASE_URL =
	"https://raw.githubusercontent.com/JulianDF/tarot-deck-assets/main";
const TOTAL = 78;
const RETRY = 3;
const TIMEOUT_MS = 30_000;
// 压缩参数（与 optimize-tarot-assets.mjs 保持一致）
const MAX_WIDTH = 360;
const MAX_HEIGHT = 630;
const WEBP_QUALITY = 80;

mkdirSync(OUT_DIR, { recursive: true });

async function download(index) {
	const url = `${BASE_URL}/${String(index).padStart(2, "0")}.jpg`;
	for (let attempt = 1; attempt <= RETRY; attempt++) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
			const res = await fetch(url, { signal: controller.signal });
			clearTimeout(timer);
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			return Buffer.from(await res.arrayBuffer());
		} catch (err) {
			if (attempt === RETRY) throw err;
			await new Promise((r) => setTimeout(r, 1000 * attempt));
		}
	}
}

let ok = 0;
let failed = [];
let totalBefore = 0;
let totalAfter = 0;
for (let i = 0; i < TOTAL; i++) {
	const target = path.join(OUT_DIR, `${i}.webp`);
	if (existsSync(target)) {
		ok++;
		continue;
	}
	try {
		const buf = await download(i);
		const before = buf.length;
		totalBefore += before;
		// 转 WebP 压缩
		const webpBuf = await sharp(buf)
			.resize(MAX_WIDTH, MAX_HEIGHT, {
				fit: "inside",
				withoutEnlargement: true,
			})
			.webp({ quality: WEBP_QUALITY })
			.toBuffer();
		const after = webpBuf.length;
		totalAfter += after;
		writeFileSync(target, webpBuf);
		console.log(
			`✓ ${i}.webp (${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB)`,
		);
		ok++;
	} catch (err) {
		console.error(`✗ ${i}.webp: ${err.message}`);
		failed.push(i);
	}
}
console.log(
	`\n完成：${ok}/${TOTAL}${failed.length ? `，失败：${failed.join(",")}` : ""}`,
);
if (totalBefore > 0) {
	console.log(
		`体积：${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB`,
	);
}
process.exit(failed.length ? 1 : 0);
