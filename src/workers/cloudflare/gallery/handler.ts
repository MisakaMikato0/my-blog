/**
 * 相册后台管理 API（/api/gallery/*）
 *
 * 公开：GET  /api/gallery/index
 * 管理：POST /api/gallery/verify
 *       POST /api/gallery/upload-token
 *       POST /api/gallery/complete
 *       POST /api/gallery/delete
 *       POST /api/gallery/album
 *       DELETE /api/gallery/album
 *       POST /api/gallery/album/cover
 *
 * 鉴权：Authorization: Bearer <GALLERY_ADMIN_TOKEN>（checkAdmin 抽象，
 * 将来接入 Cloudflare Access 时仅需修改 checkAdmin 一处）。
 */

import type { GalleryIndexResponse } from "./types";
import {
	createUploadToken,
	deleteFile,
	getUpyunConfig,
	readIndex,
	updateIndex,
} from "./upyun";

const ALBUM_ID_RE = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/i;
const FILE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

type GalleryEnv = Env;

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
 * 管理鉴权。当前实现：Bearer Token 比对。
 * 升级路径：将来在 Cloudflare 控制台给 /gallery/admin/* 与 /api/gallery/* 挂
 * Access Application，Access 会在 Worker 之前拦截，此处可改为信任
 * Cf-Access-Authenticated-User-Email 头（或直接放行）。
 */
export function checkAdmin(request: Request, env: GalleryEnv): boolean {
	const token = env.GALLERY_ADMIN_TOKEN;
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

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((v): v is string => typeof v === "string")
		.map((v) => v.trim())
		.filter((v) => v.length > 0)
		.slice(0, 20);
}

function validateAlbumId(id: string): boolean {
	return (
		ALBUM_ID_RE.test(id) &&
		id.toLowerCase() !== "admin" &&
		id.toLowerCase() !== "_dynamic"
	);
}

function validatePhotoPath(albumId: string, path: string): boolean {
	return (
		typeof path === "string" &&
		path.startsWith(`/gallery/${albumId}/`) &&
		FILE_EXT_RE.test(path) &&
		!path.includes("..")
	);
}

function getExtension(filename: string): string | null {
	const m = filename.toLowerCase().match(FILE_EXT_RE);
	if (!m) return null;
	// 统一规范化扩展名：jpeg -> jpg
	const ext = m[0].slice(1);
	return ext === "jpeg" ? "jpg" : ext;
}

async function handleGetIndex(env: GalleryEnv): Promise<Response> {
	const index = await readIndex(env);
	const cdnBase = getUpyunConfig(env).cdnHost;
	const payload: GalleryIndexResponse = { ...index, cdnBase };
	return jsonResponse(payload, 200);
}

async function handleVerify(): Promise<Response> {
	return jsonResponse({ ok: true }, 200);
}

async function handleUploadToken(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const body = await readJsonBody(request);
	const albumId = asString(body.albumId);
	const filename = asString(body.filename);
	if (!validateAlbumId(albumId)) {
		return errorResponse("invalid_album_id", 400);
	}
	const ext = getExtension(filename);
	if (!ext) {
		return errorResponse(
			"invalid_file_type",
			400,
			"Only jpg/png/webp/gif are allowed",
		);
	}
	const token = createUploadToken(env, albumId, ext);
	return jsonResponse(token, 200);
}

async function handleComplete(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const body = await readJsonBody(request);
	const albumId = asString(body.albumId);
	const path = asString(body.path);
	if (!validateAlbumId(albumId) || !validatePhotoPath(albumId, path)) {
		return errorResponse("invalid_path", 400);
	}
	const size =
		typeof body.size === "number" && Number.isFinite(body.size)
			? body.size
			: undefined;
	await updateIndex(env, (index) => {
		let album = index.albums.find((a) => a.id === albumId);
		if (!album) {
			// 静态相册首次上传时自动建档
			album = {
				id: albumId,
				name: albumId,
				dynamic: false,
				photos: [],
				createdAt: new Date().toISOString(),
			};
			index.albums.push(album);
		}
		if (!album.photos.some((p) => p.path === path)) {
			album.photos.push({
				path,
				size,
				uploadedAt: new Date().toISOString(),
			});
		}
	});
	return jsonResponse({ ok: true }, 200);
}

async function handleDelete(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const body = await readJsonBody(request);
	const albumId = asString(body.albumId);
	const path = asString(body.path);
	if (!validateAlbumId(albumId) || !validatePhotoPath(albumId, path)) {
		return errorResponse("invalid_path", 400);
	}
	await deleteFile(env, path);
	await updateIndex(env, (index) => {
		const album = index.albums.find((a) => a.id === albumId);
		if (!album) return;
		album.photos = album.photos.filter((p) => p.path !== path);
		if (album.cover === path) {
			album.cover = album.photos[0]?.path;
		}
	});
	return jsonResponse({ ok: true }, 200);
}

async function handleCreateAlbum(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const body = await readJsonBody(request);
	const id = asString(body.id).toLowerCase();
	const name = asString(body.name);
	if (!validateAlbumId(id)) {
		return errorResponse("invalid_album_id", 400);
	}
	if (!name || name.length > 60) {
		return errorResponse("invalid_album_name", 400);
	}
	const description = asString(body.description).slice(0, 300) || undefined;
	const date = asString(body.date).slice(0, 20) || undefined;
	const location = asString(body.location).slice(0, 60) || undefined;
	const tags = asStringArray(body.tags);
	const created = new Date().toISOString();

	const result = await updateIndex(env, (index) => {
		if (index.albums.some((a) => a.id === id)) {
			throw new Error("album_exists");
		}
		index.albums.push({
			id,
			name,
			description,
			date,
			location,
			tags: tags.length > 0 ? tags : undefined,
			dynamic: true,
			createdAt: created,
			photos: [],
		});
	});
	const album = result.albums.find((a) => a.id === id);
	return jsonResponse({ ok: true, album }, 200);
}

async function handleRenameAlbum(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const body = await readJsonBody(request);
	const id = asString(body.id).toLowerCase();
	const name = asString(body.name);
	if (!validateAlbumId(id)) {
		return errorResponse("invalid_album_id", 400);
	}
	if (!name || name.length > 60) {
		return errorResponse("invalid_album_name", 400);
	}
	const description = asString(body.description).slice(0, 300) || undefined;
	const date = asString(body.date).slice(0, 20) || undefined;
	const location = asString(body.location).slice(0, 60) || undefined;
	const tags = asStringArray(body.tags);

	await updateIndex(env, (index) => {
		const album = index.albums.find((a) => a.id === id);
		if (!album) {
			throw new Error("album_not_found");
		}
		// 静态相册元数据由 galleryConfig.ts 管理，只允许改动态相册
		if (!album.dynamic) {
			throw new Error("album_not_editable");
		}
		album.name = name;
		album.description = description;
		album.date = date;
		album.location = location;
		album.tags = tags.length > 0 ? tags : undefined;
	});
	return jsonResponse({ ok: true }, 200);
}

async function handleDeleteAlbum(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const url = new URL(request.url);
	const id = asString(url.searchParams.get("id")).toLowerCase();
	if (!validateAlbumId(id)) {
		return errorResponse("invalid_album_id", 400);
	}
	const index = await readIndex(env);
	const album = index.albums.find((a) => a.id === id);
	if (!album?.dynamic) {
		return errorResponse("album_not_found", 404);
	}
	// 尽力删除文件（忽略单文件失败，避免留下无法删除的相册）
	const failures: string[] = [];
	for (const photo of album.photos) {
		try {
			await deleteFile(env, photo.path);
		} catch {
			failures.push(photo.path);
		}
	}
	await updateIndex(env, (cur) => {
		cur.albums = cur.albums.filter((a) => a.id !== id);
	});
	return jsonResponse({ ok: true, failedDeletes: failures }, 200);
}

async function handleSetCover(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const body = await readJsonBody(request);
	const albumId = asString(body.albumId);
	const path = asString(body.path);
	if (!validateAlbumId(albumId) || !validatePhotoPath(albumId, path)) {
		return errorResponse("invalid_path", 400);
	}
	await updateIndex(env, (index) => {
		const album = index.albums.find((a) => a.id === albumId);
		if (!album) {
			throw new Error("album_not_found");
		}
		if (!album.photos.some((p) => p.path === path)) {
			throw new Error("photo_not_found");
		}
		album.cover = path;
	});
	return jsonResponse({ ok: true }, 200);
}

export async function handleGallery(
	request: Request,
	env: GalleryEnv,
): Promise<Response> {
	const url = new URL(request.url);
	const path = url.pathname;
	const method = request.method;

	try {
		if (method === "GET" && path === "/api/gallery/index") {
			return await handleGetIndex(env);
		}

		// 以下均为管理接口
		if (!checkAdmin(request, env)) {
			return errorResponse("unauthorized", 401);
		}

		if (method === "POST" && path === "/api/gallery/verify") {
			return handleVerify();
		}
		if (method === "POST" && path === "/api/gallery/upload-token") {
			return await handleUploadToken(request, env);
		}
		if (method === "POST" && path === "/api/gallery/complete") {
			return await handleComplete(request, env);
		}
		if (method === "POST" && path === "/api/gallery/delete") {
			return await handleDelete(request, env);
		}
		if (method === "POST" && path === "/api/gallery/album") {
			return await handleCreateAlbum(request, env);
		}
		if (method === "POST" && path === "/api/gallery/album/rename") {
			return await handleRenameAlbum(request, env);
		}
		if (method === "DELETE" && path === "/api/gallery/album") {
			return await handleDeleteAlbum(request, env);
		}
		if (method === "POST" && path === "/api/gallery/album/cover") {
			return await handleSetCover(request, env);
		}

		return errorResponse("not_found", 404);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message === "invalid JSON body") {
			return errorResponse("invalid_json", 400);
		}
		if (message === "album_exists") {
			return errorResponse("album_exists", 409);
		}
		if (message === "album_not_found") {
			return errorResponse("album_not_found", 404);
		}
		if (message === "album_not_editable") {
			return errorResponse("album_not_editable", 400);
		}
		if (message === "photo_not_found") {
			return errorResponse("photo_not_found", 404);
		}
		if (message.startsWith("UPYUN_* environment variables")) {
			return errorResponse("not_configured", 503);
		}
		console.error("gallery handler error:", message);
		return errorResponse("internal_error", 500, message);
	}
}
