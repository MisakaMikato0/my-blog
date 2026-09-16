import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
	path.resolve(process.cwd(), "src/components/widget/WeatherWidget.astro"),
	"utf8",
);

describe("天气组件新版布局契约", () => {
	it("保留原天气接口并提供横向/竖向响应式容器", () => {
		expect(source).toContain('const API_URL = "https://uapis.cn/api/v1/misc/weather?"');
		expect(source).toContain('class="weather-widget__layout"');
		expect(source).toContain('data-weather-details');
		expect(source).toContain('data-weather-pollution');
		expect(source).toContain('data-weather-mobile-toggle');
	});

	it("在桌面数据层和移动端首页都挂载同一套天气组件", () => {
		const homeLayer = fs.readFileSync(
			path.resolve(process.cwd(), "src/components/layout/HomeDataLayer.astro"),
			"utf8",
		);
		const homeMobile = fs.readFileSync(
			path.resolve(process.cwd(), "src/components/layout/HomeMobile.astro"),
			"utf8",
		);
		expect(homeLayer).toContain("<WeatherWidget />");
		expect(homeMobile).toContain("<WeatherWidget />");
	});

	it("使用桌面右侧横移入场动画并提供减少动态效果回退", () => {
		expect(source).toContain("weather-widget-enter-from-right");
		expect(source).toContain("weather-widget--enter-from-right");
		expect(source).not.toContain("weather-widget__legacy");
		expect(source).not.toContain("weather-widget__header");
		expect(source).not.toContain("weather-widget__extended");
		expect(source).not.toContain("weather-widget__update");
		expect(source).toContain("prefers-reduced-motion: reduce");
		expect(source).toContain("https://t.alcy.cc/pc");
		expect(source).toContain("https://t.alcy.cc/mp");
	});
});
