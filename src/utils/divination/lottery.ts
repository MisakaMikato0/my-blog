/**
 * 观音灵签封装
 * 基于 mingyu-core 的 drawRandomSign / resolveSignByNumber（三山国王 92 签）。
 */
import {
	drawRandomSign,
	resolveSignByNumber,
} from "mingyu-core/divination/ssgw";
import type { LotteryInput, LotteryResult } from "./types";

/**
 * 抽取观音灵签
 * - 不传 number：随机抽取
 * - 传 number：按签号查签（不模拟抽签）
 */
export function createLotteryReading(input: LotteryInput = {}): LotteryResult {
	const { customDate, number } = input;
	const data =
		number != null
			? resolveSignByNumber(number, customDate)
			: drawRandomSign(customDate);
	return { data };
}
