/**
 * 六爻排盘封装
 * 基于 mingyu-core 的 generateLiuyao（京房八宫法，火珠林纳甲）。
 */

import { hexagramsData } from "mingyu-core/divination/hexagram-data";
import { generateLiuyao } from "mingyu-core/divination/liuyao";
import type { LiuyaoInput, LiuyaoResult, LiuyaoYaoLines } from "./types";

/** 爻值：6=老阴(动) 7=少阳 8=少阴 9=老阳(动) */
const YAO_YANG = new Set([7, 9]);

/** 将 yaoArray 渲染为 Unicode 爻画（自初爻到上爻） */
function renderLines(yaoArray: number[]): string[] {
	return yaoArray.map((value, index) => {
		const isYang = YAO_YANG.has(value);
		const isMoving = value === 6 || value === 9;
		const bar = isYang ? "▅▅▅▅▅" : "▅▅ ▅▅";
		const marker = isMoving ? (isYang ? " ○" : " ×") : "";
		return `${index + 1}爻 ${bar}${marker}`;
	});
}

/** 按卦名查八卦符号（如 ☰☱），查不到返回卦名 */
function symbolOf(name: string | undefined): string {
	if (!name) return "";
	const found = hexagramsData.find((h) => h.name === name);
	return found?.symbol ?? name;
}

/**
 * 生成六爻卦盘
 * - method=time：时间起卦（默认）
 * - method=manual：手工三钱法，需提供 yaos（6/7/8/9 按初爻到上爻）
 * - method=coins：逐爻手摇三钱记录
 */
export function createLiuyaoReading(input: LiuyaoInput = {}): LiuyaoResult {
	const { customDate, method = "time", yaos } = input;
	const data = generateLiuyao(customDate, {
		method,
		...(yaos ? { yaos } : {}),
	});
	const lines: LiuyaoYaoLines = {
		lines: renderLines(data.yaoArray),
		symbol: symbolOf(data.originalName),
	};
	const changedLines =
		data.changedName && data.changingYaos.some((y) => y.isChanging)
			? {
					lines: renderLines(
						data.yaoArray.map((v, i) =>
							data.changingYaos[i]?.isChanging
								? v === 6
									? 7
									: v === 9
										? 8
										: v
								: v,
						),
					),
					symbol: symbolOf(data.changedName),
				}
			: undefined;
	return { data, lines, changedLines };
}
