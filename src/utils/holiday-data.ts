import { calendarConfig } from "@/config";
import holidayApiData from "@/data/holiday-api.json";
import { resolveYearlyDate } from "@/utils/lunar-utils";

// 节日数据装配（构建时使用，零网络依赖）
// timor.tech 法定节假日数据已缓存为静态 JSON（src/data/holiday-api.json），
// 由 scripts/update-holiday-cache.ts 手动刷新（运行时仅做本地合并，构建不再发起任何网络请求）

export type HolidayEntry = {
	date: string; // "YYYY-MM-DD"
	name: string;
	isOfficial?: boolean; // 来自 API 的法定节假日
	isWorkday?: boolean; // 调休补班日
	icon?: string;
	source: "api" | "builtin";
	rest?: number; // 假期持续天数（含当天）
};

// 静态缓存中的 API 数据（仅保留配置中目标年份，避免配置调整后混入旧年份数据）
const apiEntries: HolidayEntry[] = (holidayApiData as HolidayEntry[]).filter(
	(entry) => {
		const year = Number.parseInt(entry.date.slice(0, 4), 10);
		return calendarConfig.holidayApi.years.includes(year);
	},
);

function expandBuiltinForYear(year: number): HolidayEntry[] {
	const out: HolidayEntry[] = [];
	for (const item of calendarConfig.builtinHolidays) {
		const date = resolveYearlyDate(item.date, year);
		if (!date) continue;
		out.push({
			date,
			name: item.name,
			icon: item.icon,
			source: "builtin",
		});
	}
	return out;
}

/**
 * 装配全年节日数据：静态缓存的 API 数据 + 内置补充节日，按日期排序。
 * 页面与 /api/holidays.json 共用此函数；构建过程不访问任何外部网络。
 */
export function getHolidayEntries(): HolidayEntry[] {
	const all: HolidayEntry[] = [];

	if (calendarConfig.holidayApi.enable) {
		all.push(...apiEntries);
	}

	// 内置补充：按每个目标年份展开
	for (const y of calendarConfig.holidayApi.years) {
		all.push(...expandBuiltinForYear(y));
	}

	// 按日期排序
	all.sort((a, b) => a.date.localeCompare(b.date));

	return all;
}
