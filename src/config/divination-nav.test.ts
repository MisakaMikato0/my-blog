import { describe, expect, it } from "vitest";
import { navBarConfig } from "@/config";
import { LinkPresets } from "@/constants/link-presets";
import { LinkPreset } from "@/types/config";

describe("卜筮导航接入", () => {
	it("navBarConfig.links 包含 Divination", () => {
		const links = navBarConfig.links;
		const names = links
			.map((l) =>
				typeof l === "number" ? LinkPresets[l as LinkPreset].name : l.name,
			)
			.join(",");
		expect(names).toContain("卜筮");
	});

	it("LinkPresets 有 Divination 条目", () => {
		const preset = LinkPresets[LinkPreset.Divination];
		expect(preset.url).toBe("/divination/");
		expect(preset.name).toBe("卜筮");
	});
});
