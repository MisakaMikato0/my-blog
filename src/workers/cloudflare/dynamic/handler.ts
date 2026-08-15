/**
 * 动态管理 API（/api/dynamic*）
 *
 * 公开：GET  /api/dynamic.json
 * 管理：POST /api/dynamic/upload-token
 *       POST /api/dynamic/manage          （新增）
 *       POST /api/dynamic/manage/update   （编辑）
 *       POST /api/dynamic/manage/delete   （删除）
 *       POST /api/dynamic/manage/pin      （置顶/取消置顶）
 *
 * 鉴权：Authorization: Bearer <DYNAMIC_ADMIN_TOKEN>
 * 数据与图片：又拍云 bucket（索引 dynamic-index.json，图片 /dynamic/*）
 * 文字（markdown）与图片分开存储：正文存 markdown 原文，图片路径单独存 images[]。
 */

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
	createUploadTokenFor,
	deleteFile,
	getUpyunConfig,
} from "../gallery/upyun";
import {
	DYNAMIC_IMAGE_PREFIX,
	deleteDynamicText,
	readDynamicIndex,
	readDynamicText,
	updateDynamicIndex,
	writeDynamicText,
} from "./storage";
import type { DynamicEntry, DynamicFeedItem } from "./types";

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;
const DYNAMIC_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;
const MAX_CONTENT_LENGTH = 5000;
const MAX_IMAGES = 9;
const MAX_LOCATION_LENGTH = 60;

function jsonResponse(payload: unknown, status: number): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function errorResponse(
	code: string,
	status: number,
	message?: string,
): Response {
	return jsonResponse({ error: code, message: message || "" }, status);
}

/**
 * 管理鉴权：Bearer Token 比对（与相册后台同款，读取独立环境变量）。
 */
export function checkDynamicAdmin(request: Request, env: Env): boolean {
	const token = env.DYNAMIC_ADMIN_TOKEN;
	if (!token) return false;
	const auth = request.headers.get("Authorization") || "";
	const match = auth.match(/^Bearer\s+(.+)$/i);
	if (!match) return false;
	const presented = match[1].trim();
	if (presented.length !== token.length) return false;
	let diff = 0;
	for (let i = 0; i < token.length; i++) {
		diff |= presented.charCodeAt(i) ^ token.charCodeAt(i);
	}
	return diff === 0;
}

async function readJsonBody(
	request: Request,
): Promise<Record<string, unknown>> {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		throw new Error("invalid JSON body");
	}
}

function asString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown): boolean {
	return value === true;
}

function getExtension(filename: string): string | null {
	const m = filename.toLowerCase().match(IMAGE_EXT_RE);
	if (!m) return null;
	const ext = m[0].slice(1);
	return ext === "jpeg" ? "jpg" : ext;
}

function validateImagePath(path: string): boolean {
	return (
		typeof path === "string" &&
		path.startsWith(`${DYNAMIC_IMAGE_PREFIX}/`) &&
		IMAGE_EXT_RE.test(path) &&
		!path.includes("..")
	);
}

function validateDynamicId(id: string): boolean {
	return DYNAMIC_ID_RE.test(id);
}

/** 从请求体中提取并校验图片列表 */
function extractImages(value: unknown): DynamicEntry["images"] | null {
	if (value === undefined || value === null) return null;
	if (!Array.isArray(value)) throw new Error("invalid images");
	if (value.length > MAX_IMAGES) throw new Error("too_many_images");
	const images = value
		.filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
		.map((v) => {
			const path = asString(v.path);
			if (!validateImagePath(path)) throw new Error("invalid_image_path");
			const alt = asString(v.alt);
			return { path, alt };
		});
	// 去重
	const seen = new Set<string>();
	for (const img of images) {
		if (seen.has(img.path)) throw new Error("duplicate_image");
		seen.add(img.path);
	}
	return images;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		"p",
		"br",
		"strong",
		"b",
		"em",
		"i",
		"u",
		"s",
		"del",
		"code",
		"pre",
		"blockquote",
		"ul",
		"ol",
		"li",
		"a",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"hr",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
	],
	allowedAttributes: {
		a: ["href", "title"],
	},
	allowedSchemes: ["http", "https", "mailto"],
	transformTags: {
		a: sanitizeHtml.simpleTransform("a", {
			rel: "noopener noreferrer",
			target: "_blank",
		}),
	},
};

/** markdown → 清洗后的 html */
function renderMarkdown(content: string): string {
	const raw = marked.parse(content, { async: false, gfm: true }) as string;
	return sanitizeHtml(raw, SANITIZE_OPTIONS);
}

function toFeedItem(entry: DynamicEntry, cdnBase: string): DynamicFeedItem {
	return {
		id: entry.id,
		published: new Date(entry.createdAt).getTime(),
		html: renderMarkdown(entry.content || ""),
		images: (entry.images || []).map((img) => ({
			alt: img.alt || "",
			src: `${cdnBase}${img.path}`,
		})),
		pinned: entry.pinned,
		location: entry.location,
	};
}

function sortDynamics(dynamics: DynamicEntry[]): DynamicEntry[] {
	return [...dynamics].sort((a, b) => {
		if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}

async function handleGetFeed(env: Env): Promise<Response> {
	const index = await readDynamicIndex(env);
	const cdnBase = getUpyunConfig(env).cdnHost;
	const dynamics = await Promise.all(
		index.dynamics.map(async (entry) => ({
			...entry,
			content: await readDynamicText(env, entry.id),
		})),
	);
	const items = sortDynamics(dynamics).map((entry) =>
		toFeedItem(entry, cdnBase),
	);
	return jsonResponse(items, 200);
}

async function handleUploadToken(
	request: Request,
	env: Env,
): Promise<Response> {
	const body = await readJsonBody(request);
	const filename = asString(body.filename);
	const ext = getExtension(filename);
	if (!ext) {
		return errorResponse(
			"invalid_file_type",
			400,
			"Only jpg/png/webp/gif are allowed",
		);
	}
	const token = createUploadTokenFor(env, DYNAMIC_IMAGE_PREFIX, ext);
	return jsonResponse(token, 200);
}

async function handleCreate(request: Request, env: Env): Promise<Response> {
	const body = await readJsonBody(request);
	const content = asString(body.content);
	if (!content) {
		return errorResponse("invalid_content", 400, "Content is required");
	}
	if (content.length > MAX_CONTENT_LENGTH) {
		return errorResponse("content_too_long", 400);
	}
	const images = extractImages(body.images) || [];
	const location = asString(body.location).slice(0, MAX_LOCATION_LENGTH);
	const pinned = asBoolean(body.pinned);

	const now = new Date().toISOString();
	const id = `d-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 6)}`;
	const entry: DynamicEntry = {
		id,
		content: "",
		images,
		location,
		pinned,
		createdAt: now,
		updatedAt: now,
	};
	// 先写正文文件（text/{id}.md），再写索引元数据
	await writeDynamicText(env, id, content);
	await updateDynamicIndex(env, (index) => {
		index.dynamics.push(entry);
	});
	return jsonResponse({ ok: true, id }, 200);
}

async function handleUpdate(request: Request, env: Env): Promise<Response> {
	const body = await readJsonBody(request);
	const id = asString(body.id);
	if (!validateDynamicId(id)) {
		return errorResponse("invalid_id", 400);
	}
	// 先校验条目存在
	let exists = false;
	const index0 = await readDynamicIndex(env);
	exists = index0.dynamics.some((d) => d.id === id);
	if (!exists) {
		return errorResponse("dynamic_not_found", 404);
	}

	let nextContent: string | null = null;
	if (body.content !== undefined) {
		const content = asString(body.content);
		if (!content) {
			return errorResponse("invalid_content", 400);
		}
		if (content.length > MAX_CONTENT_LENGTH) {
			return errorResponse("content_too_long", 400);
		}
		nextContent = content;
	}
	// 先更新正文文件，再更新索引元数据
	if (nextContent !== null) {
		await writeDynamicText(env, id, nextContent);
	}
	await updateDynamicIndex(env, (index) => {
		const entry = index.dynamics.find((d) => d.id === id);
		if (!entry) throw new Error("dynamic_not_found");
		if (body.images !== undefined) {
			const images = extractImages(body.images);
			if (images) entry.images = images;
		}
		if (body.location !== undefined) {
			entry.location = asString(body.location).slice(0, MAX_LOCATION_LENGTH);
		}
		if (body.pinned !== undefined) {
			entry.pinned = asBoolean(body.pinned);
		}
		entry.updatedAt = new Date().toISOString();
	});
	return jsonResponse({ ok: true }, 200);
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
	const body = await readJsonBody(request);
	const id = asString(body.id);
	if (!validateDynamicId(id)) {
		return errorResponse("invalid_id", 400);
	}
	let removedImages: string[] = [];
	let removedId = "";
	await updateDynamicIndex(env, (index) => {
		const idx = index.dynamics.findIndex((d) => d.id === id);
		if (idx < 0) throw new Error("dynamic_not_found");
		removedId = index.dynamics[idx].id;
		removedImages = (index.dynamics[idx].images || []).map((i) => i.path);
		index.dynamics.splice(idx, 1);
	});
	// 尽力删除图片文件（忽略单文件失败，避免留下无法删除的动态）
	const failures: string[] = [];
	try {
		await deleteDynamicText(env, removedId);
	} catch {
		failures.push(`dynamic/text/${removedId}.md`);
	}
	for (const img of removedImages) {
		try {
			await deleteFile(env, img);
		} catch {
			failures.push(img);
		}
	}
	return jsonResponse({ ok: true, failedDeletes: failures }, 200);
}

async function handlePin(request: Request, env: Env): Promise<Response> {
	const body = await readJsonBody(request);
	const id = asString(body.id);
	if (!validateDynamicId(id)) {
		return errorResponse("invalid_id", 400);
	}
	const pinned = asBoolean(body.pinned);
	await updateDynamicIndex(env, (index) => {
		const entry = index.dynamics.find((d) => d.id === id);
		if (!entry) throw new Error("dynamic_not_found");
		entry.pinned = pinned;
		entry.updatedAt = new Date().toISOString();
	});
	return jsonResponse({ ok: true }, 200);
}

export async function handleDynamic(
	request: Request,
	env: Env,
): Promise<Response> {
	const url = new URL(request.url);
	const path = url.pathname;
	const method = request.method;

	try {
		if (method === "GET" && path === "/api/dynamic.json") {
			return await handleGetFeed(env);
		}

		// 以下均为管理接口
		if (!checkDynamicAdmin(request, env)) {
			return errorResponse("unauthorized", 401);
		}

		if (method === "GET" && path === "/api/dynamic/manage/list") {
			const index = await readDynamicIndex(env);
			const cdnBase = getUpyunConfig(env).cdnHost;
			const dynamics = await Promise.all(
				index.dynamics.map(async (entry) => ({
					...entry,
					content: await readDynamicText(env, entry.id),
				})),
			);
			return jsonResponse({ cdnBase, dynamics: sortDynamics(dynamics) }, 200);
		}
		if (method === "POST" && path === "/api/dynamic/upload-token") {
			return await handleUploadToken(request, env);
		}
		if (method === "POST" && path === "/api/dynamic/manage") {
			return await handleCreate(request, env);
		}
		if (method === "POST" && path === "/api/dynamic/manage/verify") {
			return jsonResponse({ ok: true }, 200);
		}
		if (method === "POST" && path === "/api/dynamic/manage/update") {
			return await handleUpdate(request, env);
		}
		if (method === "POST" && path === "/api/dynamic/manage/delete") {
			return await handleDelete(request, env);
		}
		if (method === "POST" && path === "/api/dynamic/manage/pin") {
			return await handlePin(request, env);
		}

		return errorResponse("not_found", 404);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message === "invalid JSON body") {
			return errorResponse("invalid_json", 400);
		}
		if (message === "invalid_content") {
			return errorResponse("invalid_content", 400);
		}
		if (message === "content_too_long") {
			return errorResponse("content_too_long", 400);
		}
		if (message === "invalid_image_path") {
			return errorResponse("invalid_image_path", 400);
		}
		if (message === "duplicate_image") {
			return errorResponse("duplicate_image", 400);
		}
		if (message === "too_many_images") {
			return errorResponse("too_many_images", 400);
		}
		if (message === "dynamic_not_found") {
			return errorResponse("dynamic_not_found", 404);
		}
		if (message.startsWith("UPYUN_* environment variables")) {
			return errorResponse("not_configured", 503);
		}
		console.error("dynamic handler error:", message);
		return errorResponse("internal_error", 500, message);
	}
}
