/**
 * 塔罗抽牌封装
 * 基于 mingyu-core 的 drawTarotSpread（Rider-Waite-Smith 体系）。
 */
import { drawTarotSpread } from "mingyu-core/divination/tarot";
import type { TarotInput, TarotResult } from "./types";

/**
 * 塔罗牌阵抽牌
 * spreadType 可选：single / three / love / career / decision / celtic / chakra / year / mindBodySpirit / horseshoe
 * 默认 three（时间流牌阵）。
 */
export function createTarotReading(input: TarotInput = {}): TarotResult {
	const { spreadType = "three" } = input;
	const data = drawTarotSpread(spreadType);
	return { data };
}
