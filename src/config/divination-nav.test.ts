import { describe, expect, it } from "vitest";
import { navBarConfig } from "@/config";
import { LinkPresets } from "@/constants/link-presets";
import { LinkPreset } from "@/types/config";

describe("卜筮导航接入", () => {
	it("卜筮位于爱好下拉菜单中，而不是顶层导航", () => {
		const links = navBarConfig.links;
		const hobby = links.find(
			(l) =>
				typeof l !== "number" && l.name === LinkPresets[LinkPreset.Hobby].name,
		);

		expect(hobby).toBeDefined();
		expect(
			hobby && typeof hobby !== "number" && "children" in hobby
				? hobby.children
				: [],
		).toContain(LinkPreset.Divination);
		expect(links).not.toContain(LinkPreset.Divination);
	});

	it("LinkPresets 有 Divination 条目", () => {
		const preset = LinkPresets[LinkPreset.Divination];
		expect(preset.url).toBe("/divination/");
		expect(preset.name).toBe("卜筮");
	});
});
