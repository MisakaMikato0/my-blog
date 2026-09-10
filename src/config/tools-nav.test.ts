import { describe, expect, it } from "vitest";
import { navBarConfig } from "@/config";
import { LinkPresets } from "@/constants/link-presets";
import { LinkPreset } from "@/types/config";

describe("工具导航接入", () => {
	it("工具是一级下拉菜单，工具导航和 THBWiki 位于其下方", () => {
		const links = navBarConfig.links;
		const tools = links.find(
			(link) =>
				typeof link !== "number" &&
				link.name === LinkPresets[LinkPreset.NavTools].name,
		);

		expect(tools).toBeDefined();
		expect(
			tools && typeof tools !== "number" ? tools.children : undefined,
		).toEqual([LinkPreset.Collections, LinkPreset.Feibichi]);
		expect(links).not.toContain(LinkPreset.Collections);
		expect(links).not.toContain(LinkPreset.Feibichi);
	});

	it("保留两个工具入口的地址和外链行为", () => {
		const tools = navBarConfig.links.find(
			(link) =>
				typeof link !== "number" &&
				link.name === LinkPresets[LinkPreset.NavTools].name,
		);

		expect(tools && typeof tools !== "number" ? tools.name : undefined).toBe(
			"工具",
		);
		expect(LinkPresets[LinkPreset.Collections].url).toBe("/collections/");
		expect(LinkPresets[LinkPreset.Feibichi].external).toBe(true);
	});
});
