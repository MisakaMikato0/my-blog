import { describe, expect, it } from "vitest";
import {
	deriveChangedLines,
	deriveInterLines,
	type HexagramLine,
	linesFromYaosDetail,
} from "./hexagram-diagram";

const yang = (changing = false): HexagramLine => ({ type: "阳", changing });
const yin = (changing = false): HexagramLine => ({ type: "阴", changing });

describe("linesFromYaosDetail", () => {
	it("按 position 自下而上排序", () => {
		const yaos: Array<{
			position: number;
			yaoType: "阳" | "阴";
			isChanging: boolean;
		}> = [
			{ position: 6, yaoType: "阳", isChanging: true },
			{ position: 1, yaoType: "阴", isChanging: false },
			{ position: 3, yaoType: "阳", isChanging: false },
			{ position: 2, yaoType: "阴", isChanging: false },
			{ position: 5, yaoType: "阴", isChanging: false },
			{ position: 4, yaoType: "阳", isChanging: false },
		];
		expect(linesFromYaosDetail(yaos)).toEqual([
			yin(),
			yin(),
			yang(),
			yang(),
			yin(),
			yang(true),
		]);
	});
});

describe("deriveChangedLines", () => {
	it("动爻阴阳翻转，静爻保持不变", () => {
		const original = [yang(), yin(), yang(true), yin(), yang(), yin(true)];
		expect(deriveChangedLines(original)).toEqual([
			yang(),
			yin(),
			yin(),
			yin(),
			yang(),
			yang(),
		]);
	});
});

describe("deriveInterLines", () => {
	it("坎为水（☵☵）互卦应为山雷颐（上艮☶下震☳）", () => {
		// 坎卦（☵）三爻自下而上：阴、阳、阴；坎为水 = 上坎 + 下坎
		const kan = [yin(), yang(), yin(), yin(), yang(), yin()];
		// 互卦下卦 = 本卦 2/3/4 爻（阳、阴、阴 → 震☳）
		// 互卦上卦 = 本卦 3/4/5 爻（阴、阴、阳 → 艮☶）
		expect(deriveInterLines(kan)).toEqual([
			yang(),
			yin(),
			yin(),
			yin(),
			yin(),
			yang(),
		]);
	});

	it("非六爻输入原样返回", () => {
		expect(deriveInterLines([yang(), yin()])).toEqual([yang(), yin()]);
	});
});
