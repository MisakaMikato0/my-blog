type ScrollTriggerLike = {
	refresh: (safe?: boolean) => void;
};

let frame = 0;
let pending: ScrollTriggerLike | null = null;

export function requestScrollTriggerRefresh(
	ScrollTrigger: ScrollTriggerLike,
): void {
	pending = ScrollTrigger;
	if (frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		const target = pending;
		pending = null;
		target?.refresh();
	});
}

export function cancelScrollTriggerRefresh(): void {
	if (!frame) return;
	cancelAnimationFrame(frame);
	frame = 0;
	pending = null;
}
