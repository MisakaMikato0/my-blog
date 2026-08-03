/**
 * /api/gallery/index 响应数据结构（与 Worker 侧 types.ts 对应）。
 */

export interface GalleryIndexPhotoDto {
	path: string;
	size?: number;
	uploadedAt: string;
}

export interface GalleryIndexAlbumDto {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	cover?: string;
	dynamic?: boolean;
	createdAt?: string;
	photos: GalleryIndexPhotoDto[];
}

export interface GalleryIndexDto {
	version: number;
	cdnBase?: string;
	albums: GalleryIndexAlbumDto[];
}

export interface UploadTokenDto {
	policy: string;
	signature: string;
	uploadUrl: string;
	path: string;
	cdnUrl: string;
}
