/**
 * 动态（dynamic）数据结构。
 * 数据与图片都存放在又拍云同一 bucket 内：
 * - 数据索引：dynamic-index.json
 * - 图片：/dynamic/*.{jpg,png,webp,gif}
 * 文字（markdown）与图片分开管理：图片路径存 images[]，正文为纯 markdown。
 */

export interface DynamicImage {
	/** bucket 内路径，含前导斜杠，如 /dynamic/1725000000-8f3a.webp */
	path: string;
	/** 图片说明（可选） */
	alt?: string;
}

export interface DynamicEntry {
	/** 唯一标识，如 d-lxz3k2-8f3a */
	id: string;
	/** markdown 原文（图片由 images 单独管理，不混在正文里） */
	content: string;
	/** 图片列表（可选） */
	images: DynamicImage[];
	/** 定位文本，如 "广西"，可为空 */
	location: string;
	/** 是否置顶 */
	pinned: boolean;
	/** ISO 时间字符串 */
	createdAt: string;
	updatedAt: string;
}

export interface DynamicIndex {
	version: number;
	dynamics: DynamicEntry[];
}

/** GET /api/dynamic.json 的响应条目（html 已渲染清洗，图片已拼好 CDN 完整地址） */
export interface DynamicFeedItem {
	id: string;
	published: number;
	html: string;
	images: Array<{ alt: string; src: string }>;
	pinned: boolean;
	location: string;
}

/** 管理接口请求体 */
export interface DynamicManageRequest {
	action: "create" | "update" | "delete" | "pin";
	id?: string;
	content?: string;
	images?: DynamicImage[];
	location?: string;
	pinned?: boolean;
}
