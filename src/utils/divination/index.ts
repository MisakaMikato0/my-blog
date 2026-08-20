/**
 * 卜筮核心逻辑统一出口
 * 全部为纯客户端确定性计算（基于 mingyu-core，MIT），无网络请求。
 */
export { createLiuyaoReading } from "./liuyao";
export { createLotteryReading } from "./lottery";
export { createMeihuaReading } from "./meihua";
export { createTarotReading } from "./tarot";
export type * from "./types";
export { createXiaoliurenReading } from "./xiaoliuren";
