import { describe, expect, it } from "vitest";
import { bindKnowledgeGraphLifecycle } from "@/utils/knowledge-graph-lifecycle";

describe("bindKnowledgeGraphLifecycle", () => {
	it("mounts the initial and each new root once, while tearing down before swap", () => {
		const mounts: HTMLElement[] = [];
		let teardowns = 0;
		const root = document.createElement("div");
		root.dataset.kgRoot = "";
		document.body.appendChild(root);

		bindKnowledgeGraphLifecycle({
			mount: (element) => mounts.push(element),
			teardown: () => {
				teardowns++;
			},
		});
		document.dispatchEvent(new Event("astro:page-load"));
		bindKnowledgeGraphLifecycle({
			mount: () => {
				throw new Error("duplicate script execution must not bind again");
			},
			teardown: () => {
				throw new Error("duplicate script execution must not bind again");
			},
		});
		document.dispatchEvent(new Event("astro:page-load"));

		expect(mounts).toEqual([root]);

		document.dispatchEvent(new Event("astro:before-swap"));
		expect(teardowns).toBe(1);

		root.remove();
		const nextRoot = document.createElement("div");
		nextRoot.dataset.kgRoot = "";
		document.body.appendChild(nextRoot);
		document.dispatchEvent(new Event("astro:page-load"));
		document.dispatchEvent(new Event("astro:page-load"));

		expect(mounts).toEqual([root, nextRoot]);
	});
});
