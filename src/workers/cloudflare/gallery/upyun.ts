/**
 * 又拍云云存储集成：
 * - REST API：读写 gallery-index.json、删除文件（操作员签名认证）
 * - 表单 API：签发浏览器直传的 policy + signature
 *
 * 参考：https://docs.upyun.com/api/rest_api/  https://docs.upyun.com/api/form_api/
 */

import { md5 } from "./md5";
import type { GalleryIndex } from "./types";

const UPYUN_API_BASE = "https://v0.api.upyun.com";
const UPYUN_FORM_API_BASE = "https://v0.api.upyun.com";
const INDEX_KEY = "gallery-index.json";

/** 单文件上传大小上限（字节）：5MB */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UpyunEnv {
	UPYUN_BUCKET?: string;
	UPYUN_OPERATOR?: string;
	UPYUN_OPERATOR_PASSWORD?: string;
	UPYUN_FORM_API_SECRET?: string;
	UPYUN_CDN_HOST?: string;
}

interface UpyunConfig {
	bucket: string;
	operator: string;
	password: string;
	formSecret: string;
	cdnHost: string;
}

export function getUpyunConfig(env: UpyunEnv): UpyunConfig {
	const {
		UPYUN_BUCKET,
		UPYUN_OPERATOR,
		UPYUN_OPERATOR_PASSWORD,
		UPYUN_FORM_API_SECRET,
		UPYUN_CDN_HOST,
	} = env;
	if (
		!UPYUN_BUCKET ||
		!UPYUN_OPERATOR ||
		!UPYUN_OPERATOR_PASSWORD ||
		!UPYUN_FORM_API_SECRET ||
		!UPYUN_CDN_HOST
	) {
		throw new Error("UPYUN_* environment variables are not fully configured");
	}
	return {
		bucket: UPYUN_BUCKET,
		operator: UPYUN_OPERATOR,
		password: UPYUN_OPERATOR_PASSWORD,
		formSecret: UPYUN_FORM_API_SECRET,
		cdnHost: UPYUN_CDN_HOST.replace(/\/+$/, ""),
	};
}

function b64encodeUtf8(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * REST API 签名（又拍云现行认证方式）：
 *   PasswordMD5  = MD5(操作员密码).hexdigest().lower()
 *   StringToSign = METHOD&URI&DATE[&Content-MD5]
 *   Signature    = Base64(HMAC-SHA1(key=PasswordMD5, data=StringToSign))
 * 参考：https://docs.upyun.com/api/authorization/
 */
async function restAuthorization(
	method: string,
	uri: string,
	date: string,
	config: UpyunConfig,
	contentMd5?: string,
): Promise<string> {
	const passwordMd5 = md5(config.password);
	const stringToSign = contentMd5
		? `${method}&${uri}&${date}&${contentMd5}`
		: `${method}&${uri}&${date}`;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(passwordMd5),
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(stringToSign),
	);
	const signatureBase64 = btoa(
		String.fromCharCode(...new Uint8Array(signature)),
	);
	return `UPYUN ${config.operator}:${signatureBase64}`;
}

async function restHeaders(
	method: string,
	uri: string,
	config: UpyunConfig,
	opts?: { contentType?: string; body?: string },
): Promise<Record<string, string>> {
	const date = new Date().toUTCString();
	const contentMd5 = opts?.body ? md5(opts.body) : undefined;
	const headers: Record<string, string> = {
		Authorization: await restAuthorization(
			method,
			uri,
			date,
			config,
			contentMd5,
		),
		Date: date,
	};
	if (contentMd5) headers["Content-MD5"] = contentMd5;
	if (opts?.contentType) headers["Content-Type"] = opts.contentType;
	return headers;
}

/** 读取索引；不存在时返回空索引 */
export async function readIndex(env: UpyunEnv): Promise<GalleryIndex> {
	const config = getUpyunConfig(env);
	const uri = `/${config.bucket}/${INDEX_KEY}`;
	const res = await fetch(`${UPYUN_API_BASE}${uri}`, {
		headers: await restHeaders("GET", uri, config),
	});
	if (res.status === 404) {
		return { version: 0, albums: [] };
	}
	if (!res.ok) {
		throw new Error(`Upyun read index failed: ${res.status}`);
	}
	const data = (await res.json()) as GalleryIndex;
	if (
		!data ||
		!Array.isArray(data.albums) ||
		typeof data.version !== "number"
	) {
		return { version: 0, albums: [] };
	}
	return data;
}

/** 写索引 */
export async function writeIndex(
	env: UpyunEnv,
	index: GalleryIndex,
): Promise<void> {
	const config = getUpyunConfig(env);
	const uri = `/${config.bucket}/${INDEX_KEY}`;
	const body = JSON.stringify(index);
	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await fetch(`${UPYUN_API_BASE}${uri}`, {
			method: "PUT",
			headers: await restHeaders("PUT", uri, config, {
				contentType: "application/json",
				body,
			}),
			body,
		});
		if (res.ok) return;
		const text = await res.text();
		// 又拍云对同一 key 的并发写会返回 42900007，指数退避重试
		if (res.status === 429 && attempt < 4) {
			await sleep(300 * 2 ** attempt);
			continue;
		}
		throw new Error(`Upyun write index failed: ${res.status} ${text}`);
	}
}

/** 删除 bucket 内文件（path 含前导斜杠）；文件不存在视为成功 */
export async function deleteFile(env: UpyunEnv, path: string): Promise<void> {
	const config = getUpyunConfig(env);
	const uri = `/${config.bucket}${path}`;
	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await fetch(`${UPYUN_API_BASE}${uri}`, {
			method: "DELETE",
			headers: await restHeaders("DELETE", uri, config),
		});
		if (res.ok || res.status === 404) return;
		const text = await res.text();
		if (res.status === 429 && attempt < 4) {
			await sleep(300 * 2 ** attempt);
			continue;
		}
		throw new Error(`Upyun delete failed: ${res.status} ${text}`);
	}
}

/**
 * 读-改-写索引（乐观锁：写前重读校验版本，冲突则重试）。
 * 个人博客并发极低，此策略足够。
 */
export async function updateIndex(
	env: UpyunEnv,
	mutate: (index: GalleryIndex) => void,
): Promise<GalleryIndex> {
	for (let attempt = 0; attempt < 4; attempt++) {
		const index = await readIndex(env);
		const version = index.version || 0;
		mutate(index);
		index.version = version + 1;
		// 写前重读，校验版本未被其他写入者修改（尽力而为的 CAS）
		const fresh = await readIndex(env);
		if ((fresh.version || 0) !== version) {
			continue;
		}
		await writeIndex(env, index);
		return index;
	}
	throw new Error("gallery index update conflict, please retry");
}

export interface UploadToken {
	policy: string;
	signature: string;
	uploadUrl: string;
	path: string;
	cdnUrl: string;
}

/** 签发浏览器直传凭证（又拍云表单 API） */
export function createUploadToken(
	env: UpyunEnv,
	albumId: string,
	ext: string,
): UploadToken {
	const config = getUpyunConfig(env);
	const random = Math.random().toString(36).slice(2, 6);
	const path = `/gallery/${albumId}/${Date.now()}-${random}.${ext}`;
	const policyObj = {
		bucket: config.bucket,
		"save-key": path,
		expiration: Math.floor(Date.now() / 1000) + 600, // 10 分钟有效
		"content-length-range": `0,${MAX_FILE_SIZE}`,
		"allow-file-type": "jpg,jpeg,png,webp,gif",
	};
	const policy = b64encodeUtf8(JSON.stringify(policyObj));
	const signature = md5(`${policy}&${config.formSecret}`);
	return {
		policy,
		signature,
		uploadUrl: `${UPYUN_FORM_API_BASE}/${config.bucket}/`,
		path,
		cdnUrl: `${config.cdnHost}${path}`,
	};
}
