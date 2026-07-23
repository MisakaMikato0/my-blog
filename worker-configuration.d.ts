/// <reference types="@cloudflare/workers-types" />

declare global {
	interface Env {
		AI: Ai;
		VECTORIZE: VectorizeIndex;
		GITHUB_TOKEN?: string;
		AI_API_KEY?: string;
		ALLOWED_ORIGINS?: string;
		PUBLIC_SITE_URL?: string;
	}
}

export {};
