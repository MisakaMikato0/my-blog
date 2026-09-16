import { describe, expect, it } from "vitest";
import { navBarConfig } from "@/config";
import { LinkPresets } from "@/constants/link-presets";
import { LinkPreset } from "@/types/config";

describe("导航配置接入", () => {
	it("导航作为一级入口，个人主站收纳到 Logo 资料卡", () => {
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
			navigation && typeof navigation !== "number"
				? navigation.name
				: undefined,
		).toBe("导航");
		expect(navigation && typeof navigation !== "number" ? navigation.url : undefined).toBe("/collections/");
		expect(links).toContain(navigation);
		expect(navBarConfig.personalSites).toEqual([
		{
			name: "个人主站",
			url: "https://www.mmzhiku.xyz/",
			icon: "material-symbols:link",
		},
	]);
	});
});
