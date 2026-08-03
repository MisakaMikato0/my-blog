/// <reference types="@cloudflare/workers-types" />

declare global {
	interface Env {
		AI: Ai;
		VECTORIZE: VectorizeIndex;
		ASSETS: Fetcher;
		GITHUB_TOKEN?: string;
		AI_API_KEY?: string;
		ALLOWED_ORIGINS?: string;
		PUBLIC_SITE_URL?: string;
		GALLERY_ADMIN_TOKEN?: string;
		UPYUN_BUCKET?: string;
		UPYUN_OPERATOR?: string;
		UPYUN_OPERATOR_PASSWORD?: string;
		UPYUN_FORM_API_SECRET?: string;
		UPYUN_CDN_HOST?: string;
	}
}

export {};
