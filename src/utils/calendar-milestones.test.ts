import {
	getHolidayOccurrences,
	milestoneFromOccurrences,
} from "@utils/calendar-milestones";
import { describe, expect, it } from "vitest";

describe("日历里程碑", () => {
	it("合并相邻的同名多日假期并过滤补班日", () => {
		const occurrences = getHolidayOccurrences([
			{ date: "2026-10-01", name: "国庆节" },
			{ date: "2026-10-02", name: "国庆节" },
			{ date: "2026-10-03", name: "国庆节", isWorkday: true },
			{ date: "2026-12-25", name: "圣诞节" },
		]);

		expect(occurrences).toEqual([
			{ title: "国庆节", date: "2026-10-01" },
			{ title: "圣诞节", date: "2026-12-25" },
		]);
	});

	it("返回有界的年度进度和下一次事件剩余天数", () => {
		const milestone = milestoneFromOccurrences(
			[
				{ title: "建站纪念日", date: "2025-06-15" },
				{ title: "建站纪念日", date: "2026-06-15" },
			],
			"2026-03-15",
		);

		expect(milestone).toMatchObject({
			title: "建站纪念日",
			date: "2026-06-15",
			remainingDays: 92,
		});
		expect(milestone?.progress).toBeGreaterThanOrEqual(0);
		expect(milestone?.progress).toBeLessThanOrEqual(100);
	});
});
