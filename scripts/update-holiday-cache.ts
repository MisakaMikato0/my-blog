import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarConfig } from "../src/config/calendarConfig";

// 从 timor.tech 中国法定节假日 API 刷新静态缓存（含调休、补班）
// 产物：src/data/holiday-api.json，构建时由 src/utils/holiday-data.ts 读取，构建本身零网络依赖
// 运行：pnpm exec tsx scripts/update-holiday-cache.ts

// 年份直接取自配置，新增年份只需改 calendarConfig.holidayApi.years
const YEARS = calendarConfig.holidayApi.years;
const BASE_URL = "https://timor.tech/api/holiday/year/";
const FETCH_ATTEMPTS = 4;
const FETCH_TIMEOUT_MS = 15_000;
const OUTPUT_FILE = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"src",
	"data",
	"holiday-api.json",
);

type TimorHoliday = {
	holiday: boolean; // true=放假, false=补班
	name: string;
	wage?: number;
	date?: string;
	rest?: number;
};

type TimorResponse = {
	code: number;
	holiday: Record<string, TimorHoliday>;
};

type ApiEntry = {
	date: string; // "YYYY-MM-DD"
	name: string;
	isOfficial: boolean; // 法定节假日
	isWorkday: boolean; // 调休补班日
	source: "api";
};

async function fetchYear(year: number): Promise<ApiEntry[]> {
	const url = `${BASE_URL}${year}`;
	for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { Accept: "application/json" },
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});
			if (!res.ok) {
				console.warn(
					`[update-holiday-cache] ${url} responded ${res.status} (attempt ${attempt})`,
				);
			} else {
				const data = (await res.json()) as TimorResponse;
				if (data.code !== 0 || !data.holiday) {
					console.warn(
						`[update-holiday-cache] ${url} returned non-zero code: ${data.code} (attempt ${attempt})`,
					);
				} else {
					const entries: ApiEntry[] = [];
					for (const item of Object.values(data.holiday)) {
						if (!item.date) continue;
						entries.push({
							date: item.date,
							name: item.name,
							isOfficial: item.holiday,
							isWorkday: !item.holiday,
							source: "api",
						});
					}
					return entries;
				}
			}
		} catch (err) {
			console.warn(
				`[update-holiday-cache] fetch ${url} failed (attempt ${attempt}):`,
				err,
			);
		}
	}
	return [];
}

const all = (await Promise.all(YEARS.map(fetchYear)))
	.flat()
	.sort((a, b) => a.date.localeCompare(b.date));

// 保护：抓取为空时不要覆盖已有缓存（例如 2027 数据官方尚未公布、或网络故障）
if (all.length === 0 && existsSync(OUTPUT_FILE)) {
	console.error(
		`[update-holiday-cache] no data fetched and ${OUTPUT_FILE} already exists; keeping existing cache.`,
	);
	process.exit(1);
}

mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(OUTPUT_FILE, `${JSON.stringify(all, null, "\t")}\n`, "utf-8");
console.log(
	`[update-holiday-cache] wrote ${all.length} entries to ${OUTPUT_FILE}`,
);
