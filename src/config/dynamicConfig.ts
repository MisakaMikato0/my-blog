import type { DynamicConfig } from "@/types/config";

// 动态页配置
export const dynamicConfig: DynamicConfig = {
	// 页面标题，留空则使用 i18n 翻译
	title: "",

	// 页面描述，留空则使用 i18n 翻译
	description: "",

	// 动态头像和名称的跳转地址
	profileUrl: "/about/",

	// 每页显示的动态数量
	itemsPerPage: 20,

	// 动态数据接口（Cloudflare Worker 运行时返回，发布即时生效）
	apiUrl: "/api/dynamic.json",
};
