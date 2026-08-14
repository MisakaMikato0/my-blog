/**
 * /albums 相册(滚轮体验)共享类型
 */

/** 滚轮选择器中的一个选项 */
export interface AlbumsWheelOption {
	/** "all" 或相册 id */
	id: string;
	/** 显示名称 */
	name: string;
	/** 封面图（缩略图优先），用于背景与选中态 */
	cover?: string;
	/** 照片数量（可选展示） */
	count?: number;
}

/** 瀑布流中的一张照片 */
export interface AlbumPhotoItem {
	/** 原图 URL（灯箱使用） */
	src: string;
	/** 缩略图 URL（列表使用，缺省回退原图） */
	thumb?: string;
	/** 说明文字 */
	caption?: string;
	/** 所属相册 id */
	albumId: string;
}

/** /api/gallery/index 响应（与 gallery 组件 types 保持一致，避免循环依赖） */
export interface AlbumsIndexDto {
	version?: number;
	cdnBase?: string;
	albums?: Array<{
		id: string;
		name: string;
		description?: string;
		date?: string;
		location?: string;
		tags?: string[];
		cover?: string;
		dynamic?: boolean;
		createdAt?: string;
		photos?: Array<{ path: string; size?: number; uploadedAt: string }>;
	}>;
}
