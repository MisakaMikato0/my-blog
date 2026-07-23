import { handleCloudflareAiSearch } from "../src/workers/cloudflare/ai-search/runtime";
import { handleGithubContributions } from "../src/workers/cloudflare/github-contributions/handler";
import { handlePosterImage } from "../src/workers/cloudflare/poster-image/handler";

const STATIC_SECURITY_HEADERS: Record<string, string> = {
	"Content-Security-Policy-Report-Only": [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'self'",
		"form-action 'self' https:",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data: https:",
		"style-src 'self' 'unsafe-inline' https:",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
		"connect-src 'self' https: wss:",
		"media-src 'self' blob: https:",
		"frame-src https:",
		"worker-src 'self' blob:",
	].join("; "),
	"Permissions-Policy":
		"camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "SAMEORIGIN",
};

function withHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
		if (!headers.has(name)) headers.set(name, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/ai-chat") {
			return handleCloudflareAiSearch(request, env);
		}
		if (url.pathname === "/api/github-contributions") {
			return handleGithubContributions(request, env, ctx);
		}
		if (url.pathname === "/api/poster-image") {
			return handlePosterImage(request);
		}

		if (url.pathname.startsWith("/admin")) {
			return withHeaders(await env.ASSETS.fetch(request));
		}

		// Static assets via Pages
		if (env.ASSETS) {
			const response = await env.ASSETS.fetch(request);
			return withHeaders(response);
		}
		return new Response("Not Found", { status: 404 });
	},
};
