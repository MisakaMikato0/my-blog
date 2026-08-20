import type { LiuyaoYaoDetail, MeihuaYaoDetail } from "mingyu-core/divination";

/** 单爻线：阳爻为实线，阴爻为断线 */
export interface HexagramLine {
	type: "阳" | "阴";
	changing: boolean;
}

export interface HexagramDiagramItem {
	name: string;
	lines: HexagramLine[];
	/** 角标说明（如 动/互/变） */
	note?: string;
}

/** 从排盘数据的 yaosDetail（position 1-6，自下而上）构建爻线 */
export function linesFromYaosDetail(
	yaos: Array<
		Pick<
			LiuyaoYaoDetail | MeihuaYaoDetail,
			"position" | "yaoType" | "isChanging"
		>
	>,
): HexagramLine[] {
	return yaos
		.slice()
		.sort((a, b) => a.position - b.position)
		.map((y) => ({ type: y.yaoType, changing: y.isChanging }));
}

/** 由本卦推导变卦：动爻阴阳翻转 */
export function deriveChangedLines(
	lines: readonly HexagramLine[],
): HexagramLine[] {
	return lines.map((l) =>
		l.changing
			? { type: l.type === "阳" ? "阴" : "阳", changing: false }
			: { ...l },
	);
}

/** 由本卦推导互卦：2/3/4 爻为下卦、3/4/5 爻为上卦（自下而上） */
export function deriveInterLines(
	lines: readonly HexagramLine[],
): HexagramLine[] {
	if (lines.length !== 6) return lines.map((l) => ({ ...l }));
	// lines[0]=初爻 … lines[5]=上爻
	return [lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]].map(
		(l) => ({ ...l, changing: false }),
	);
}
