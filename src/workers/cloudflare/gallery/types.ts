/**
 * 相册索引（gallery-index.json）数据类型。
 * 索引与图片都存放在又拍云同一 bucket 内。
 */

export interface GalleryIndexPhoto {
	/** bucket 内路径，含前导斜杠，如 /gallery/album/1722750000-8f3a.webp */
	path: string;
	/** 文件大小（字节） */
	size?: number;
	uploadedAt: string;
}

export interface GalleryIndexAlbum {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	/** 封面路径（bucket 内路径）；缺省时取 photos[0].path */
	cover?: string;
	/** true = 管理页创建的动态相册；false = 仓库内静态相册（首次上传时自动建档） */
	dynamic: boolean;
	createdAt?: string;
	photos: GalleryIndexPhoto[];
}

export interface GalleryIndex {
	version: number;
	albums: GalleryIndexAlbum[];
}

/** GET /api/gallery/index 的响应（附带 CDN 域名便于前端拼接图片 URL） */
export interface GalleryIndexResponse extends GalleryIndex {
	cdnBase: string;
}
