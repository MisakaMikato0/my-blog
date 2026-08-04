/**
 * 将 functions/_worker.ts（高级模式 Pages Worker）打包为 dist/_worker.js。
 *
 * 背景：`wrangler pages deploy dist/` 只把输出目录里的 `_worker.js` 识别为
 * 高级模式 Worker（仓库根目录的 `functions/_worker.ts` 不会被 wrangler CLI 打包，
 * 只有 Cloudflare 平台侧的 Git 集成才会编译它）。
 * 因此这里用 `wrangler deploy --dry-run --outdir` 借助 wrangler 自带的打包器
 * 把 Worker 构建产物输出到 dist/_worker.js，随静态资源一起部署。
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const configPath = path.join(root, "wrangler.worker.jsonc");
const outFile = path.join(root, "dist", "_worker.js");

if (!process.env.CI) {
	// 本地运行时把 wrangler 配置目录指到临时目录，避免写用户 AppData
	process.env.XDG_CONFIG_HOME = path.join(tmpdir(), "codex-wrangler-config");
}

const tmpDir = mkdtempSync(path.join(tmpdir(), "gallery-worker-"));
try {
	const result = spawnSync(
		process.execPath,
		[wranglerBin, "deploy", "--config", configPath, "--dry-run", "--outdir", tmpDir],
		{ cwd: root, stdio: "inherit" },
	);
	if (result.status !== 0) {
		throw new Error(`wrangler dry-run failed with exit code ${result.status}`);
	}
	const bundlePath = path.join(tmpDir, "_worker.js");
	if (!existsSync(bundlePath)) {
		throw new Error("worker bundle not produced");
	}
	copyFileSync(bundlePath, outFile);
	console.log(`Worker bundle written to ${outFile}`);
} finally {
	rmSync(tmpDir, { recursive: true, force: true });
}
