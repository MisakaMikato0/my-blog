import { siteConfig } from "@/config";
import type {
	UserSubjectCollection,
	UserSubjectCollectionResponse,
} from "@/types/bangumi";

const API_BASE = "https://api.bgm.tv";
const PAGE_LIMIT = 50;
const REQUEST_DELAY = 50;
const MAX_TOTAL = 1000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;

// 可选：BANGUMI_TOKEN 从 .env 读取（已 gitignore，不提交仓库）。
// 携带令牌可读取私有收藏条目，并获得更高的 API 限流配额。
const bangumiToken = import.meta.env.BANGUMI_TOKEN as string | undefined;

async function fetchWithRetry(
	url: string,
	attempt = 0,
): Promise<Response | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const headers: Record<string, string> = {
			"User-Agent": "YuuOuRou Blog",
			Accept: "application/json",
		};
		if (bangumiToken) {
			headers.Authorization = `Bearer ${bangumiToken}`;
		}

		const response = await fetch(url, {
			headers,
			signal: controller.signal,
		});
		clearTimeout(timer);

		if (response.ok) {
			return response;
		}
		if (attempt < MAX_RETRIES) {
			await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
			return fetchWithRetry(url, attempt + 1);
		}
		return null;
	} catch (_error) {
		clearTimeout(timer);
		if (attempt < MAX_RETRIES) {
			await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
			return fetchWithRetry(url, attempt + 1);
		}
		return null;
	}
}

/**
 * 构建时从 api.bgm.tv 分页抓取指定类型的收藏条目。
 * 数据量小（几十条）时仅需 1~2 个请求，对构建时间影响可忽略。
 * 开发模式下只抓取一页以加速调试。
 */
export async function fetchBangumiCollections(
	subjectType: number,
): Promise<UserSubjectCollection[]> {
	const userId = siteConfig.bangumi?.userId;
	if (!userId || userId === "you-user-id" || userId.trim() === "") {
		return [];
	}

	const isDev = import.meta.env.DEV;
	let offset = 0;
	let allData: UserSubjectCollection[] = [];
	let hasMore = true;

	while (hasMore) {
		if (MAX_TOTAL > 0 && allData.length >= MAX_TOTAL) {
			break;
		}
		if (isDev && allData.length >= PAGE_LIMIT) {
			break;
		}

		const url = `${API_BASE}/v0/users/${encodeURIComponent(userId)}/collections?subject_type=${subjectType}&limit=${PAGE_LIMIT}&offset=${offset}`;

		const response = await fetchWithRetry(url);
		if (response) {
			const data = (await response.json()) as UserSubjectCollectionResponse;
			const batch = data.data || [];
			allData = allData.concat(batch);
			offset += PAGE_LIMIT;

			if (batch.length < PAGE_LIMIT) {
				hasMore = false;
			}

			if (hasMore && !isDev) {
				await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
			}
		} else {
			break;
		}
	}

	return allData;
}
