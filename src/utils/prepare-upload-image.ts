import { MAX_UPLOAD_FILE_SIZE } from "@/constants/upload";
import { normalizeImageOrientation } from "@/utils/image-orientation";

export const FILE_TOO_LARGE = "FILE_TOO_LARGE";

function replaceExtension(filename: string, ext: string): string {
	const base = filename.replace(/\.[^.]+$/, "");
	return `${base}.${ext}`;
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodeWithinLimit(
	source: CanvasImageSource,
	width: number,
	height: number,
	maxBytes: number,
	basename: string,
): Promise<File | null> {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(source, 0, 0, width, height);

	const attempts: Array<{ type: string; ext: string; quality: number }> = [
		{ type: "image/webp", ext: "webp", quality: 0.92 },
		{ type: "image/webp", ext: "webp", quality: 0.8 },
		{ type: "image/jpeg", ext: "jpg", quality: 0.85 },
		{ type: "image/jpeg", ext: "jpg", quality: 0.72 },
	];
	for (const attempt of attempts) {
		const blob = await canvasToBlob(canvas, attempt.type, attempt.quality);
		if (blob && blob.size <= maxBytes) {
			return new File([blob], replaceExtension(basename, attempt.ext), {
				type: attempt.type,
			});
		}
	}
	return null;
}

/**
 * 上传前准备：EXIF 转正；超过直传上限时压缩到上限以内。
 * 仍无法压到上限（例如超大 GIF）时抛 FILE_TOO_LARGE。
 */
export async function prepareUploadImage(
	file: File,
	maxBytes: number = MAX_UPLOAD_FILE_SIZE,
): Promise<File> {
	const normalized = await normalizeImageOrientation(file);
	if (normalized.size <= maxBytes) return normalized;
	if (normalized.type === "image/gif") {
		throw new Error(FILE_TOO_LARGE);
	}

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(normalized);
	} catch {
		throw new Error(FILE_TOO_LARGE);
	}

	try {
		let width = bitmap.width;
		let height = bitmap.height;
		let encoded = await encodeWithinLimit(
			bitmap,
			width,
			height,
			maxBytes,
			normalized.name,
		);
		if (encoded) return encoded;

		for (let i = 0; i < 4; i++) {
			width = Math.max(1, Math.round(width * 0.75));
			height = Math.max(1, Math.round(height * 0.75));
			encoded = await encodeWithinLimit(
				bitmap,
				width,
				height,
				maxBytes,
				normalized.name,
			);
			if (encoded) return encoded;
		}
		throw new Error(FILE_TOO_LARGE);
	} finally {
		bitmap.close();
	}
}

export function getUpyunUploadError(
	status: number,
	body: string,
): Error | null {
	let data: { code?: unknown; message?: unknown } | null = null;
	try {
		data = JSON.parse(body) as { code?: unknown; message?: unknown };
	} catch {
		data = null;
	}
	const code = typeof data?.code === "number" ? data.code : status;
	const ok =
		status >= 200 &&
		status < 300 &&
		(data?.code === undefined || data.code === 200);
	if (ok) return null;

	const message =
		typeof data?.message === "string" && data.message
			? data.message
			: `HTTP ${status || code}`;
	if (/file too large/i.test(message)) {
		return new Error(FILE_TOO_LARGE);
	}
	return new Error(message);
}
