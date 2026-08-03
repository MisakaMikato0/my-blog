import { getHolidayEntries } from "@/utils/holiday-data";

// 返回静态缓存（src/data/holiday-api.json）+ 内置节日的合并数据，构建零网络依赖
// 数据装配逻辑见 src/utils/holiday-data.ts，页面与 endpoint 共用

export type { HolidayEntry } from "@/utils/holiday-data";

export async function GET(): Promise<Response> {
	const entries = getHolidayEntries();
	return new Response(JSON.stringify(entries), {
		headers: { "Content-Type": "application/json" },
	});
}
