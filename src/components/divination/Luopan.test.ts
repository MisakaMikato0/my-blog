import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Luopan from "./Luopan.svelte";

describe("Luopan 罗盘", () => {
	it("所有环与天池文字都围绕盘心 (400,400) 旋转", () => {
		const { container } = render(Luopan);
		const transforms = Array.from(
			container.querySelectorAll<SVGGElement>("svg g[transform]"),
		).map((g) => g.getAttribute("transform") ?? "");

		// 56 个环内文字组 + 1 个指针组，全部必须以盘心为旋转/平移原点
		expect(transforms).toHaveLength(57);
		expect(transforms.every((t) => t.includes("translate(400 400)"))).toBe(
			true,
		);

		// 四层环 + 天池的 56 个字按环速旋转
		const rotating = transforms.filter((t) => t.includes("rotate("));
		expect(rotating).toHaveLength(56);
	});

	it("四层环文字数量与卦爻线条数量正确", () => {
		const { container } = render(Luopan);
		const count = (sel: string) =>
			container.querySelectorAll<SVGElement>(sel).length;

		expect(count("g.luopan-ring--r24 text")).toBe(24);
		expect(count("g.luopan-ring--rbr text")).toBe(12);
		expect(count("g.luopan-ring--rtr text")).toBe(8);
		expect(count("g.luopan-ring--rst text")).toBe(8);
		expect(count("g.luopan-ring--rtr line")).toBe(36); // 12 阳爻 + 24 阴爻断线
		// 天池四正
		expect(
			Array.from(container.querySelectorAll<SVGTextElement>("svg text")).filter(
				(t) =>
					t.textContent !== null &&
					["子", "卯", "午", "酉"].includes(t.textContent) &&
					!t.closest(".luopan-ring"),
			),
		).toHaveLength(4);
	});

	it("实时读数默认指向子山坎卦北方", () => {
		const { container } = render(Luopan);
		expect(container.querySelector(".luopan__readout")?.textContent).toContain(
			"子山",
		);
	});
});
