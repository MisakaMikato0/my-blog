import { afterEach, describe, expect, it, vi } from "vitest";
import {
	cancelScrollTriggerRefresh,
	requestScrollTriggerRefresh,
} from "@/utils/scroll-trigger-refresh";

describe("ScrollTrigger refresh scheduler", () => {
	afterEach(() => {
		cancelScrollTriggerRefresh();
		vi.restoreAllMocks();
	});

	it("coalesces refresh requests in one animation frame", () => {
		const refresh = vi.fn();
		const raf = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((callback) => {
				callback(0);
				return 1;
			});

		requestScrollTriggerRefresh({ refresh });
		requestScrollTriggerRefresh({ refresh });

		expect(raf).toHaveBeenCalledTimes(1);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it("cancels a pending refresh", () => {
		const refresh = vi.fn();
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const cancel = vi.spyOn(window, "cancelAnimationFrame");

		requestScrollTriggerRefresh({ refresh });
		cancelScrollTriggerRefresh();

		expect(cancel).toHaveBeenCalledWith(1);
		expect(refresh).not.toHaveBeenCalled();
	});
});
