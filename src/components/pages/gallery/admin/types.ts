export interface AdminPhoto {
	path: string;
	url: string;
	size?: number;
	uploadedAt: string;
}

export interface AlbumDraft {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
}
