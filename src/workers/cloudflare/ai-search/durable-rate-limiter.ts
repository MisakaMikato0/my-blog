import type {
	RateLimiter as RateLimiterContract,
	RateLimitResult,
} from "@/server/ai-search/contracts";
import { aiSearchConfig } from "@/config/aiSearchConfig";

function getClientIp(request: Request): string {
	return request.headers.get("CF-Connecting-IP") || "development";
}

async function hashRateLimitKey(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	const bytes = new Uint8Array(digest);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const stores = new Map<string, RateLimitEntry>();

export class InMemoryRateLimiter implements RateLimiterContract {
	async check(request: Request): Promise<RateLimitResult> {
		const key = await hashRateLimitKey(`ai-chat:${getClientIp(request)}`);
		const now = Date.now();
		const max = aiSearchConfig.rateLimit.maxRequests;
		const windowSeconds = aiSearchConfig.rateLimit.windowSeconds;
		const windowMs = windowSeconds * 1000;

		const entry = stores.get(key);
		if (!entry || entry.resetAt <= now) {
			stores.set(key, { count: 1, resetAt: now + windowMs });
			return { allowed: true, remaining: max - 1, retryAfter: 0 };
		}

		const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
		if (entry.count >= max) {
			return { allowed: false, remaining: 0, retryAfter };
		}

		entry.count += 1;
		return {
			allowed: true,
			remaining: Math.max(0, max - entry.count),
			retryAfter: 0,
		};
	}
}
