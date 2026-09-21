/** Run async work over a list with a fixed number of in-flight tasks. */
export async function runWithConcurrency<T>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
	if (items.length === 0) return;
	const concurrency = Math.max(1, Math.min(Math.floor(limit), items.length));
	let next = 0;
	async function runWorker(): Promise<void> {
		while (true) {
			const index = next;
			next += 1;
			if (index >= items.length) return;
			const item = items[index];
			if (item === undefined) return;
			await worker(item, index);
		}
	}
	await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
}

/** Serialize async work that must not overlap, such as gallery index complete. */
export function createMutex(): <R>(fn: () => Promise<R>) => Promise<R> {
	let tail: Promise<void> = Promise.resolve();
	return function lock<R>(fn: () => Promise<R>): Promise<R> {
		const run = tail.then(fn, fn);
		tail = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	};
}
