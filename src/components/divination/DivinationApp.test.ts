import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DivinationApp from "@/components/divination/DivinationApp.svelte";

describe("DivinationApp 组件", () => {
	it("渲染五个方法 Tab", () => {
		render(DivinationApp);
		expect(screen.getByRole("tab", { name: /六爻/ })).toBeTruthy();
		expect(screen.getByRole("tab", { name: /梅花易数/ })).toBeTruthy();
		expect(screen.getByRole("tab", { name: /小六壬/ })).toBeTruthy();
		expect(screen.getByRole("tab", { name: /观音灵签/ })).toBeTruthy();
		expect(screen.getByRole("tab", { name: /塔罗/ })).toBeTruthy();
	});

	it("六爻面板：时间起卦点击后渲染盘面", async () => {
		render(DivinationApp);
		// 默认选中六爻，点击起卦按钮
		const castBtn = screen.getByRole("button", { name: "起卦" });
		await fireEvent.click(castBtn);
		// 渲染结果：出现干支与六爻表格结构（时间起卦结果随当前时间变化，仅断言稳定结构）
		expect(await screen.findByText(/干支/)).toBeTruthy();
		const body = document.body.textContent ?? "";
		expect(body).toContain("爻位");
		expect(body).toContain("六神");
		expect(body).toContain("纳甲");
	});

	it("切换到小六壬并起课", async () => {
		render(DivinationApp);
		const tab = screen.getByRole("tab", { name: /小六壬/ });
		await fireEvent.click(tab);
		const btn = screen.getByRole("button", { name: "起课" });
		await fireEvent.click(btn);
		expect(await screen.findByText(/占得：/)).toBeTruthy();
	});

	it("切换到塔罗并抽牌", async () => {
		render(DivinationApp);
		const tab = screen.getByRole("tab", { name: /塔罗/ });
		await fireEvent.click(tab);
		const btn = screen.getByRole("button", { name: "抽牌" });
		await fireEvent.click(btn);
		await screen.findByText(/时间流牌阵/);
		// 牌面图片必须引用有效的 tarot 图片（无 NaN、无 number 缺失导致的坏路径）
		const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
		expect(imgs.length).toBeGreaterThan(0);
		for (const img of imgs) {
			expect(img.src).toMatch(/\/images\/tarot\/\d+\.webp$/);
			expect(img.src).not.toContain("NaN");
		}
	});
});
