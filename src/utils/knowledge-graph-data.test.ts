import { describe, expect, it } from "vitest";
import { buildKnowledgeGraphData } from "@/utils/knowledge-graph-data";

const options = {
	uncategorizedName: "Uncategorized",
	categoryUrl: (name: string) => "/categories/" + name + "/",
	tagUrl: (name: string) => "/tags/" + name + "/",
	siteStartDate: "2020-01-01T00:00:00.000Z",
};

describe("buildKnowledgeGraphData", () => {
	it("builds four tiers, normalizes tags, and keeps rendered heading slugs", () => {
		const graph = buildKnowledgeGraphData(
			[
				{
					id: "first",
					title: "First",
					url: "/posts/first/",
					published: "2024-01-02T00:00:00.000Z",
					category: "Guides",
					tags: ["Astro", " Astro ", ""],
					headings: [
						{ depth: 1, slug: "first", text: "First" },
						{ depth: 2, slug: "install-1", text: "Install" },
						{ depth: 3, slug: "ignored", text: "Ignored" },
					],
				},
				{
					id: "second",
					title: "Second",
					url: "/posts/second/",
					published: "2024-02-03T00:00:00.000Z",
					category: undefined,
					tags: ["Astro", "CSS"],
					headings: [],
				},
			],
			options,
		);

		expect(graph.nodes.map((node) => node.id)).toEqual(
			expect.arrayContaining([
				"c:Guides",
				"c:Uncategorized",
				"t:Astro",
				"t:CSS",
				"p:first",
				"p:second",
				"h:first#install-1",
			]),
		);
		expect(
			graph.nodes.find((node) => node.id === "h:first#install-1"),
		).toMatchObject({
			tier: "heading",
			url: "/posts/first/#install-1",
			postId: "first",
			depth: 2,
		});
		expect(graph.nodes.some((node) => node.id.endsWith("#ignored"))).toBe(
			false,
		);
		expect(graph.links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: "c:Guides",
					target: "t:Astro",
					kind: "category-tag",
				}),
				expect.objectContaining({
					source: "t:Astro",
					target: "p:first",
					kind: "tag-post",
				}),
				expect.objectContaining({
					source: "p:first",
					target: "h:first#install-1",
					kind: "post-heading",
				}),
				expect.objectContaining({
					source: "t:Astro",
					target: "t:CSS",
					kind: "tag-tag",
					value: 1,
				}),
			]),
		);
		expect(graph.meta).toMatchObject({
			version: 1,
			headingDepth: 2,
			counts: { category: 2, tag: 2, post: 2, heading: 1 },
			timeRange: {
				from: Date.parse("2020-01-01T00:00:00.000Z"),
				to: Date.parse("2024-02-03T00:00:00.000Z"),
			},
		});
	});

	it("links an untagged post directly to its category", () => {
		const graph = buildKnowledgeGraphData(
			[
				{
					id: "untagged",
					title: "Untagged",
					url: "/posts/untagged/",
					published: "2024-03-01T00:00:00.000Z",
					category: "Notes",
					tags: [],
					headings: [],
				},
			],
			options,
		);
		expect(graph.links).toContainEqual({
			source: "c:Notes",
			target: "p:untagged",
			kind: "category-post",
			value: 1,
		});
	});
});
