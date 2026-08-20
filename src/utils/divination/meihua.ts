/**
 * 梅花易数排盘封装
 * 基于 mingyu-core 的 generateMeihua（邵氏心易，体用生克）。
 */
import { generateMeihua } from "mingyu-core/divination/meihua";
import type { MeihuaInput, MeihuaResult } from "./types";

/**
 * 生成梅花易数卦盘
 * - method=time：年月日时起卦（默认）
 * - method=number：数字起卦，需提供 number
 */
export function createMeihuaReading(input: MeihuaInput = {}): MeihuaResult {
	const { customDate, method = "time", number } = input;
	const data = generateMeihua(customDate, {
		method,
		...(number != null ? { number } : {}),
	});
	return { data };
}
