import { describe, expect, it } from "vitest";
import {
	buildOrganizationEntity,
	buildPersonEntity,
	buildWebSiteEntity,
	serializeJsonLd,
} from "@/utils/schema-utils";

describe("schema utilities", () => {
	it("serializes JSON-LD without allowing a less-than sign to close the script", () => {
		expect(serializeJsonLd({ description: "a < b" })).toBe(
			String.raw`{"description":"a \u003c b"}`,
		);
	});

	it("builds site entities with stable IDs sharing one site root", () => {
		const site = "https://example.com/blog/";

		expect(buildWebSiteEntity(site)["@id"]).toBe("https://example.com/#website");
		expect(buildPersonEntity(site)["@id"]).toBe("https://example.com/#person");
		expect(buildOrganizationEntity(site)["@id"]).toBe(
			"https://example.com/#organization",
		);
	});
});
