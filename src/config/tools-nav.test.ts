import { describe, expect, it } from "vitest";
import { navBarConfig } from "@/config";
import { LinkPresets } from "@/constants/link-presets";
import { LinkPreset } from "@/types/config";

describe("工具导航接入", () => {
	it("导航是一级下拉菜单，飞碟池和知识图谱位于其下方", () => {
		const links = navBarConfig.links;
		const navLinksPreset = (LinkPreset as unknown as { NavLinks: LinkPreset })
			.NavLinks;
		expect(navLinksPreset).toBeDefined();
		if (navLinksPreset === undefined) return;

		const navigation = links.find(
			(link) =>
				typeof link !== "number" &&
				link.name === LinkPresets[navLinksPreset].name,
		);

		expect(navigation).toBeDefined();
		expect(
			navigation && typeof navigation !== "number" ? navigation.children : undefined,
		).toEqual([LinkPreset.Feibichi, LinkPreset.Collections]);
		expect(
			navigation && typeof navigation !== "number" ? navigation.name : undefined,
		).toBe("导航");
		expect(links).not.toContain(LinkPreset.Collections);
		expect(links).not.toContain(LinkPreset.Feibichi);
	});

	it("保留两个工具入口的地址和外链行为", () => {
		const navLinksPreset = (LinkPreset as unknown as { NavLinks: LinkPreset })
			.NavLinks;
		expect(navLinksPreset).toBeDefined();
		if (navLinksPreset === undefined) return;

		const navigation = navBarConfig.links.find(
			(link) =>
				typeof link !== "number" &&
				link.name === LinkPresets[navLinksPreset].name,
		);

		expect(
			navigation && typeof navigation !== "number" ? navigation.name : undefined,
		).toBe("导航");
		expect(LinkPresets[LinkPreset.Collections].url).toBe("/collections/");
		expect(LinkPresets[LinkPreset.Feibichi].external).toBe(true);
	});
});
