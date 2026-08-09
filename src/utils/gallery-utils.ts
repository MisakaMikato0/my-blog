import fs from "node:fs";
import path from "node:path";
import type { GalleryAlbum } from "@/types/config";
import { url } from "@/utils/url-utils";

function withBase(assetPath: string): string {
	if (!assetPath) return "";
	if (/^(https?:)?\/\//i.test(assetPath) || /^(data|blob):/i.test(assetPath)) {
		return assetPath;
	}
	const normalizedPath = assetPath.startsWith("/")
		? assetPath
		: `/${assetPath}`;
	const base = import.meta.env.BASE_URL || "/";
	if (base !== "/" && normalizedPath.startsWith(base)) {
		return normalizedPath;
	}
	return url(normalizedPath);
}

/**
 * 扫描相册目录中的所有图片文件
 */
export function scanAlbumPhotos(albumId: string): string[] {
	const dir = path.join(process.cwd(), "public", "gallery", albumId);
	if (!fs.existsSync(dir)) return [];
	const files = fs
		.readdirSync(dir)
		.filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
		.sort();
	// 将 cover.* 排到第一位
	const coverIdx = files.findIndex((f) => /^cover\./i.test(f));
	if (coverIdx > 0) {
		const [coverFile] = files.splice(coverIdx, 1);
		files.unshift(coverFile);
	}
	return files.map((f) => withBase(`/gallery/${albumId}/${f}`));
}

/**
 * 获取相册封面图
 * 优先级：手动指定 > cover.* 文件 > 第一张图片
 */
export function getAlbumCover(album: GalleryAlbum, photos: string[]): string {
	if (album.cover) return withBase(album.cover);
	const coverFile = photos.find((p) => /\/cover\./i.test(p));
	return coverFile || photos[0] || "";
}

/**
 * 读取相册的照片说明
 * 优先读取 per-album captions.json，回退到集中式 captions.json
 */
export function readAlbumCaptions(albumId: string): Record<string, string> {
	// 方案1: per-album 文件 public/gallery/{albumId}/captions.json
	const perAlbumPath = path.join(
		process.cwd(),
		"public",
		"gallery",
		albumId,
		"captions.json",
	);
	if (fs.existsSync(perAlbumPath)) {
		try {
			const raw = fs.readFileSync(perAlbumPath, "utf-8");
			const parsed = JSON.parse(raw);
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				!Array.isArray(parsed)
			) {
				return sanitizeCaptions(parsed);
			}
		} catch (err) {
			console.warn(
				`[gallery-utils] Failed to parse per-album captions.json for "${albumId}":`,
				err,
			);
		}
	}

	// 方案2: 集中式文件 public/gallery/captions.json
	const centralPath = path.join(
		process.cwd(),
		"public",
		"gallery",
		"captions.json",
	);
	if (fs.existsSync(centralPath)) {
		try {
			const raw = fs.readFileSync(centralPath, "utf-8");
			const parsed = JSON.parse(raw);
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				!Array.isArray(parsed)
			) {
				const albumCaptions = parsed[albumId];
				if (
					typeof albumCaptions === "object" &&
					albumCaptions !== null &&
					!Array.isArray(albumCaptions)
				) {
					return sanitizeCaptions(albumCaptions);
				}
			}
		} catch (err) {
			console.warn(
				`[gallery-utils] Failed to parse central captions.json for "${albumId}":`,
				err,
			);
		}
	}

	return {};
}

/**
 * 过滤并清洗 captions 对象，只保留非空字符串值
 */
function sanitizeCaptions(
	obj: Record<string, unknown>,
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "string" && value.trim()) {
			result[key] = value.trim();
		}
	}
	return result;
}
