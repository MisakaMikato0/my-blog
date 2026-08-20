/**
 * 下载 Rider-Waite 塔罗牌图片（公有领域，来源 JulianDF/tarot-deck-assets）
 * 文件 00.jpg ~ 77.jpg 对应 mingyu-core tarotCards 的 number-1（愚者=0 … 星币国王=77）
 * 目标目录：public/images/tarot/
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "images", "tarot");
const BASE_URL = "https://raw.githubusercontent.com/JulianDF/tarot-deck-assets/main";
const TOTAL = 78;
const RETRY = 3;
const TIMEOUT_MS = 30_000;

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
			const buf = Buffer.from(await res.arrayBuffer());
			writeFileSync(path.join(OUT_DIR, `${index}.jpg`), buf);
			return buf.length;
		} catch (err) {
			if (attempt === RETRY) throw err;
			await new Promise((r) => setTimeout(r, 1000 * attempt));
		}
	}
}

let ok = 0;
let failed = [];
for (let i = 0; i < TOTAL; i++) {
	const target = path.join(OUT_DIR, `${i}.jpg`);
	if (existsSync(target)) {
		ok++;
		continue;
	}
	try {
		const bytes = await download(i);
		console.log(`✓ ${i}.jpg (${bytes} bytes)`);
		ok++;
	} catch (err) {
		console.error(`✗ ${i}.jpg: ${err.message}`);
		failed.push(i);
	}
}
console.log(`\n完成：${ok}/${TOTAL}${failed.length ? `，失败：${failed.join(",")}` : ""}`);
process.exit(failed.length ? 1 : 0);
