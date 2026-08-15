/**
 * 动态数据存储：又拍云 bucket 内的 dynamic-index.json。
 * 复用相册的又拍云 REST 读写封装（readJsonFile / writeJsonFile / updateJsonFile）。
 */

import {
	deleteFile,
	readBucketFile,
	readJsonFile,
	updateJsonFile,
	writeBucketFile,
} from "../gallery/upyun";
import type { DynamicIndex } from "./types";

/**
 * 又拍云 bucket 内动态目录结构：
 * - dynamic/text/   存内容：每条动态一个 {id}.md + 索引 index.json
 * - dynamic/img/    存图片
 */
/** 索引文件（text 目录内） */
export const DYNAMIC_INDEX_KEY = "dynamic/text/index.json";
/** 内容（md）目录 */
export const DYNAMIC_TEXT_DIR = "dynamic/text";
/** 图片目录前缀（含前导斜杠，用于签发直传凭证） */
export const DYNAMIC_IMAGE_PREFIX = "/dynamic/img";

/** 读取动态索引；不存在时返回空索引 */
export async function readDynamicIndex(env: Env): Promise<DynamicIndex> {
	const data = await readJsonFile<DynamicIndex>(env, DYNAMIC_INDEX_KEY);
	if (
		!data ||
		!Array.isArray(data.dynamics) ||
		typeof data.version !== "number"
	) {
		return { version: 0, dynamics: [] };
	}
	return data;
}

/** 读-改-写动态索引（乐观锁） */
export function updateDynamicIndex(
	env: Env,
	mutate: (index: DynamicIndex) => void,
): Promise<DynamicIndex> {
	return updateJsonFile<DynamicIndex>(env, DYNAMIC_INDEX_KEY, (data) => {
		// 首次创建时数据为空对象，先补齐默认结构
		if (!Array.isArray(data.dynamics)) data.dynamics = [];
		if (typeof data.version !== "number") data.version = 0;
		mutate(data);
	});
}

/** 读取一条动态的正文（md 文件）；不存在时返回空串 */
export async function readDynamicText(env: Env, id: string): Promise<string> {
	const text = await readBucketFile(env, `${DYNAMIC_TEXT_DIR}/${id}.md`);
	return text ?? "";
}

/** 写入一条动态的正文（md 文件） */
export function writeDynamicText(
	env: Env,
	id: string,
	content: string,
): Promise<void> {
	return writeBucketFile(
		env,
		`${DYNAMIC_TEXT_DIR}/${id}.md`,
		content,
		"text/markdown; charset=utf-8",
	);
}

/** 删除一条动态的正文（md 文件）；文件不存在视为成功 */
export function deleteDynamicText(env: Env, id: string): Promise<void> {
	return deleteFile(env, `/${DYNAMIC_TEXT_DIR}/${id}.md`);
}
