/**
 * 小六壬排盘封装
 * 基于 mingyu-core 的 generateXiaoliuren（通行时间课，六宫顺数）。
 */
import { generateXiaoliuren } from "mingyu-core/divination/xiaoliuren";
import type { XiaoliurenInput, XiaoliurenResult } from "./types";

/** 生成小六壬时间课（月、日、时三盘定位） */
export function createXiaoliurenReading(
	input: XiaoliurenInput = {},
): XiaoliurenResult {
	const { customDate } = input;
	const data = generateXiaoliuren({
		method: "time",
		customDate,
	});
	return { data };
}
