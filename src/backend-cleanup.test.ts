import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPostFiles } from "../scripts/post-loader";

const root = new URL("../", import.meta.url);

function readRootFile(relativePath: string): string {
	return readFileSync(new URL(relativePath, root), "utf8");
}

describe("AI search backend cleanup", () => {
	it("removes only the AI route from the Pages Worker", () => {
		const worker = readRootFile("functions/_worker.ts");

		expect(worker).not.toContain("handleCloudflareAiSearch");
		expect(worker).not.toContain("/api/ai-chat");
		expect(worker).toContain("/api/divination/interpret");
		expect(worker).toContain("/api/github-contributions");
		expect(worker).toContain("/api/gallery/");
		expect(worker).toContain("/api/dynamic");
		expect(worker).toContain("STATIC_SECURITY_HEADERS");
		expect(worker).toContain("env.ASSETS.fetch");
	});

	it("removes AI-only files and references while retaining Worker tooling", () => {
		const packageJson = readRootFile("package.json");
		const tsconfig = readRootFile("tsconfig.json");
		const indexnow = readRootFile("scripts/indexnow.ts");
		const workerTypes = readRootFile("worker-configuration.d.ts");

		expect(existsSync(new URL("src/worker.ts", root))).toBe(false);
		expect(existsSync(new URL("src/server/ai-search", root))).toBe(false);
		expect(existsSync(new URL("src/workers/cloudflare/ai-search", root))).toBe(false);
		expect(existsSync(new URL("scripts/ai-search", root))).toBe(false);
		expect(existsSync(new URL("src/config/aiSearchConfig.ts", root))).toBe(false);
		expect(existsSync(new URL("src/types/ai-search.ts", root))).toBe(false);
		expect(packageJson).not.toContain("build-index");
		expect(packageJson).not.toContain("scripts/ai-search");
		expect(tsconfig).not.toContain("scripts/ai-search");
		expect(indexnow).toContain('import { loadPostFiles } from "./post-loader"');
		expect(indexnow).toContain("!post.draft && !post.password");
		expect(workerTypes).not.toContain("VECTORIZE");
		expect(workerTypes).not.toContain("AI: Ai");
		expect(packageJson).toContain('"worker:types": "wrangler types"');
		expect(packageJson).toContain('"test:worker": "vitest run --config vitest.config.ts"');
		expect(packageJson).toContain('"wrangler": "4.110.0"');
	});

	it("loads IndexNow metadata and filters draft/password posts", async () => {
		const cwd = mkdtempSync(path.join(os.tmpdir(), "my-blog-indexnow-"));
		const postsDir = path.join(cwd, "src", "content", "posts", "notes");
		mkdirSync(postsDir, { recursive: true });
		writeFileSync(
			path.join(postsDir, "published.md"),
			"---\ntitle: Published\n---\n# Published\n",
		);
		writeFileSync(
			path.join(postsDir, "draft.md"),
			"---\ndraft: true\ntitle: Draft\n---\n# Draft\n",
		);
		writeFileSync(
			path.join(postsDir, "private.md"),
			"---\npassword: secret\ntitle: Private\n---\n# Private\n",
		);

		try {
			await expect(loadPostFiles(cwd)).resolves.toEqual([
				{ slug: "notes/draft", draft: true, password: false },
				{ slug: "notes/private", draft: false, password: true },
				{ slug: "notes/published", draft: false, password: false },
			]);
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});
