/** 日历里程碑计算：从按年重复的事件序列推算下一个事件及其周期进度。 */

function dateStamp(dateKey: string): number {
	const [year, month, day] = dateKey.split("-").map(Number);
	return Date.UTC(year, month - 1, day);
}

function daysBetween(fromKey: string, toKey: string): number {
	return Math.round((dateStamp(toKey) - dateStamp(fromKey)) / 86400000);
}

function shiftYear(dateKey: string, offset: number): string {
	const [year, month, day] = dateKey.split("-").map(Number);
	const shiftedYear = year + offset;
	const shiftedDay = Math.min(day, new Date(shiftedYear, month, 0).getDate());
	return (
		String(shiftedYear) +
		"-" +
		String(month).padStart(2, "0") +
		"-" +
		String(shiftedDay).padStart(2, "0")
	);
}

export interface YearlyEventInput {
	date: string;
	name: string;
	isWorkday?: boolean;
}

export interface MilestoneOccurrence {
	title: string;
	date: string;
}

export interface Milestone {
	title: string;
	date: string;
	progress: number;
	remainingDays: number;
}

export function formatYmd(date: Date): string {
	return (
		String(date.getFullYear()) +
		"-" +
		String(date.getMonth() + 1).padStart(2, "0") +
		"-" +
		String(date.getDate()).padStart(2, "0")
	);
}

export function getHolidayOccurrences(
	holidays: YearlyEventInput[],
): MilestoneOccurrence[] {
	const sorted = holidays
		.filter((item) => item.date && item.name && !item.isWorkday)
		.slice()
		.sort((a, b) => a.date.localeCompare(b.date));

	const occurrences: (MilestoneOccurrence & { endDate: string })[] = [];
	for (const item of sorted) {
		const previous = occurrences[occurrences.length - 1];
		if (
			previous &&
			previous.title === item.name &&
			daysBetween(previous.endDate, item.date) <= 1
		) {
			if (item.date > previous.endDate) previous.endDate = item.date;
			continue;
		}
		occurrences.push({ title: item.name, date: item.date, endDate: item.date });
	}
	return occurrences.map(({ title, date }) => ({ title, date }));
}

export function milestoneFromOccurrences(
	occurrences: MilestoneOccurrence[],
	todayKey: string,
): Milestone | null {
	const sorted = occurrences
		.slice()
		.sort((a, b) => a.date.localeCompare(b.date));
	const next = sorted.find((item) => item.date >= todayKey);
	if (!next) return null;

	const previous = sorted
		.filter((item) => item.title === next.title && item.date < next.date)
		.pop();
	const previousDate = previous ? previous.date : shiftYear(next.date, -1);
	const totalDays = Math.max(1, daysBetween(previousDate, next.date));
	const elapsedDays = Math.min(
		totalDays,
		Math.max(0, daysBetween(previousDate, todayKey)),
	);

	return {
		title: next.title,
		date: next.date,
		progress: Math.round((elapsedDays / totalDays) * 100),
		remainingDays: Math.max(0, daysBetween(todayKey, next.date)),
	};
}
