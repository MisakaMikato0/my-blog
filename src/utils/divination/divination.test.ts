import { describe, expect, it } from "vitest";
import {
	createLiuyaoReading,
	createLotteryReading,
	createMeihuaReading,
	createTarotReading,
	createXiaoliurenReading,
} from "./index";

// 固定时间输入，验证算法确定性
const FIXED_DATE = new Date("2026-08-20T13:30:00+08:00");

describe("六爻排盘", () => {
	it("时间起卦输出结构完整且确定", () => {
		const a = createLiuyaoReading({ customDate: FIXED_DATE });
		const b = createLiuyaoReading({ customDate: FIXED_DATE });
		expect(a.data.originalName).toBe("风泽中孚");
		expect(a.data.ganzhi).toEqual(b.data.ganzhi);
		expect(a.data.yaoArray).toEqual(b.data.yaoArray);
		expect(a.data.yaosDetail).toHaveLength(6);
		expect(a.lines.lines).toHaveLength(6);
		expect(a.lines.symbol).toBeTruthy();
	});

	it("手工三钱法（yaos）可复现指定卦例", () => {
		const r = createLiuyaoReading({
			customDate: FIXED_DATE,
			method: "manual",
			yaos: [6, 7, 8, 9, 7, 8],
		});
		expect(r.data.yaoArray).toEqual([6, 7, 8, 9, 7, 8]);
		expect(r.data.originalName).toBe("泽水困");
		expect(r.data.changedName).toBe("水泽节");
	});
});

describe("梅花易数", () => {
	it("时间起卦体用确定", () => {
		const a = createMeihuaReading({ customDate: FIXED_DATE });
		const b = createMeihuaReading({ customDate: FIXED_DATE });
		expect(a.data.mainHexagram.name).toBe("坎为水");
		expect(a.data.tiGua.name).toBe("坎");
		expect(a.data.analysis.tiYongRelation).toBe(b.data.analysis.tiYongRelation);
		expect(a.data.movingYao.position).toBe(6);
	});

	it("数字起卦确定", () => {
		const a = createMeihuaReading({
			customDate: FIXED_DATE,
			method: "number",
			number: 123,
		});
		const b = createMeihuaReading({
			customDate: FIXED_DATE,
			method: "number",
			number: 123,
		});
		expect(a.data.mainHexagram.name).toBe("离为火");
		expect(a.data.movingYao.position).toBe(5);
		expect(a.data.mainHexagram.name).toBe(b.data.mainHexagram.name);
	});
});

describe("小六壬", () => {
	it("固定时间掌诀定位确定", () => {
		const a = createXiaoliurenReading({ customDate: FIXED_DATE });
		const b = createXiaoliurenReading({ customDate: FIXED_DATE });
		expect(a.data.primary.name).toBe("速喜");
		expect(a.data.palaceOrder).toHaveLength(6);
		expect(a.data.sequence.hour.name).toBe("速喜");
		expect(a.data.primary.name).toBe(b.data.primary.name);
	});
});

describe("观音灵签", () => {
	it("按签号取签确定", () => {
		const a = createLotteryReading({
			customDate: FIXED_DATE,
			number: 12,
		});
		const b = createLotteryReading({
			customDate: FIXED_DATE,
			number: 12,
		});
		expect(a.data.number).toBe(12);
		expect(a.data.poem.length).toBeGreaterThan(0);
		expect(a.data.title).toContain("第十二签");
		expect(a.data.ganzhi).toEqual(b.data.ganzhi);
	});

	it("随机抽取结果结构完整", () => {
		const r = createLotteryReading({ customDate: FIXED_DATE });
		expect(r.data.number).toBeGreaterThanOrEqual(1);
		expect(r.data.number).toBeLessThanOrEqual(92);
		expect(r.data.poem.length).toBeGreaterThan(0);
	});
});

describe("塔罗", () => {
	it("三张牌阵输出结构完整", () => {
		const r = createTarotReading({ spreadType: "three" });
		expect(r.data.spreadName).toBeTruthy();
		expect(r.data.cards).toHaveLength(3);
		for (const card of r.data.cards) {
			expect(card.name.length).toBeGreaterThan(0);
			expect(card.position.length).toBeGreaterThan(0);
		}
	});
});
