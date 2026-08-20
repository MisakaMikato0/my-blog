/**
 * 卜筮页面统一类型定义
 * 基于 mingyu-core（Brhiza/mingyu，MIT）的纯算法封装，
 * 全部为客户端确定性计算，无任何网络请求。
 */
import type {
	LiuyaoData,
	MeihuaData,
	SsgwData,
	TarotData,
	TarotSpreadType,
	XiaoliurenData,
} from "mingyu-core/divination";

/** 六爻起卦方式 */
export type LiuyaoMethod = "time" | "manual" | "coins";

/** 梅花易数起卦方式 */
export type MeihuaMethod = "time" | "number";

/** 统一输入参数：各方法共用 customDate（可省略，默认当前时间） */
export interface DivinationInput {
	/** 自定义起卦时间（带时区的 ISO/Date），不传则使用当前时间 */
	customDate?: Date;
}

/** 六爻输入 */
export interface LiuyaoInput extends DivinationInput {
	method?: LiuyaoMethod;
	/** 手工三钱法：按初爻到上爻传入 6、7、8、9 */
	yaos?: number[];
}

/** 梅花易数输入 */
export interface MeihuaInput extends DivinationInput {
	method?: MeihuaMethod;
	/** 数字起卦用（1-9999） */
	number?: number;
}

/** 小六壬输入 */
export interface XiaoliurenInput extends DivinationInput {
	method?: "time";
}

/** 观音灵签输入 */
export interface LotteryInput extends DivinationInput {
	/** 指定签号（1-92），不传则随机抽取 */
	number?: number;
}

/** 塔罗输入 */
export interface TarotInput extends DivinationInput {
	spreadType?: TarotSpreadType;
}

/** 六爻卦画（Unicode 爻象） */
export interface LiuyaoYaoLines {
	/** 从初爻到上爻，每爻一行 */
	lines: string[];
	/** 主卦八卦符号（如 ☰☱） */
	symbol: string;
}

/** 六爻排盘结果（mingyu-core 原始数据 + 派生卦画） */
export interface LiuyaoResult {
	data: LiuyaoData;
	lines: LiuyaoYaoLines;
	/** 变卦卦画（若有动爻） */
	changedLines?: LiuyaoYaoLines;
}

/** 梅花易数结果 */
export interface MeihuaResult {
	data: MeihuaData;
}

/** 小六壬结果 */
export interface XiaoliurenResult {
	data: XiaoliurenData;
}

/** 观音灵签结果 */
export interface LotteryResult {
	data: SsgwData;
}

/** 塔罗结果 */
export interface TarotResult {
	data: TarotData;
}

export type {
	LiuyaoData,
	MeihuaData,
	SsgwData,
	TarotData,
	TarotSpreadType,
	XiaoliurenData,
};
