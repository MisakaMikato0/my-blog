import { describe, expect, it, vi } from "vitest";
import { waitForPageLoaderHidden } from "@/utils/page-loader-controller.js";

describe("waitForPageLoaderHidden", () => {
	it("resolves when the hidden event is lost and timeout expires", async () => {
		document.body.innerHTML = '<div id="page-loader"></div>';
		vi.useFakeTimers();

		const promise = waitForPageLoaderHidden({ timeout: 10 });
		await vi.advanceTimersByTimeAsync(10);

		await expect(promise).resolves.toBeUndefined();
		vi.useRealTimers();
	});
});
