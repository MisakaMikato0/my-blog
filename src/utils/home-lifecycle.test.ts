import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindHomeLayer } from "@/utils/home-lifecycle";

describe("bindHomeLayer", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("mounts each home root once and remounts after before-swap", () => {
		const boot = vi.fn();
		const teardown = vi.fn();
		bindHomeLayer({ boot, teardown });

		const firstRoot = document.createElement("main");
		firstRoot.className = "home-page";
		document.body.append(firstRoot);
		document.dispatchEvent(new Event("astro:page-load"));
		document.dispatchEvent(new Event("astro:page-load"));

		expect(boot).toHaveBeenCalledTimes(1);

		document.dispatchEvent(new Event("astro:before-swap"));
		expect(teardown).toHaveBeenCalledTimes(1);

		firstRoot.remove();
		const secondRoot = document.createElement("main");
		secondRoot.className = "home-page";
		document.body.append(secondRoot);
		document.dispatchEvent(new Event("astro:page-load"));

		expect(boot).toHaveBeenCalledTimes(2);
	});
});
