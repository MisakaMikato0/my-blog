import { describe, expect, it } from "vitest";
import { createMutex, runWithConcurrency } from "@/utils/run-with-concurrency";

describe("runWithConcurrency", () => {
	it("runs every item", async () => {
		const seen: number[] = [];
		await runWithConcurrency([1, 2, 3], 2, async (item) => {
			seen.push(item);
		});
		expect(seen.sort()).toEqual([1, 2, 3]);
	});

	it("does not exceed the concurrency cap", async () => {
		let inFlight = 0;
		let maxInFlight = 0;
		await runWithConcurrency([0, 1, 2, 3, 4, 5], 3, async () => {
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			expect(inFlight).toBeLessThanOrEqual(3);
			await Promise.resolve();
			inFlight -= 1;
		});
		expect(maxInFlight).toBe(3);
	});
});

describe("createMutex", () => {
	it("runs locked work one at a time even if callers overlap", async () => {
		const lock = createMutex();
		const order: number[] = [];
		await Promise.all([
			lock(async () => {
				order.push(1);
				await Promise.resolve();
				order.push(2);
			}),
			lock(async () => {
				order.push(3);
				order.push(4);
			}),
		]);
		expect(order).toEqual([1, 2, 3, 4]);
	});

	it("starts the next job after a rejected lock", async () => {
		const lock = createMutex();
		await expect(
			lock(async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		await expect(lock(async () => "ok")).resolves.toBe("ok");
	});
});
