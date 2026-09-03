/**
 * 首页平滑滚动（Lenis）。
 *
 * 只在桌面精确指针设备上接管滚轮，并将 Lenis 的每帧更新挂到 GSAP
 * ticker，确保首页现有的 ScrollTrigger pin/scrub 动画与滚动位置同帧更新。
 */
const DESKTOP_QUERY = "(min-width: 769px)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let teardownFn: (() => void) | null = null;
let bootGeneration = 0;

function deactivate(): void {
	teardownFn?.();
	teardownFn = null;
	bootGeneration += 1;
}

export function bootHomeSmoothScroll(): void {
	deactivate();
	const generation = bootGeneration;

	if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
	if (!window.matchMedia(FINE_POINTER_QUERY).matches) return;

	const desktopQuery = window.matchMedia(DESKTOP_QUERY);
	if (!desktopQuery.matches) return;

	let cancelled = false;
	let dispose: (() => void) | null = null;

	void (async () => {
		const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
			import("lenis"),
			import("gsap"),
			import("gsap/ScrollTrigger"),
		]);
		if (cancelled || generation !== bootGeneration) return;

		gsap.registerPlugin(ScrollTrigger);
		const lenis = new Lenis({ lerp: 0.12 });
		const updateScrollTrigger = () => ScrollTrigger.update();
		const raf = (time: number) => lenis.raf(time * 1000);

		lenis.on("scroll", updateScrollTrigger);
		gsap.ticker.add(raf);
		gsap.ticker.lagSmoothing(0);

		const cleanup = () => {
			lenis.off("scroll", updateScrollTrigger);
			gsap.ticker.remove(raf);
			lenis.destroy();
		};
		if (cancelled || generation !== bootGeneration) cleanup();
		else dispose = cleanup;
	})();

	const onBreakpointChange = () => {
		deactivate();
		bootHomeSmoothScroll();
	};
	desktopQuery.addEventListener("change", onBreakpointChange);

	teardownFn = () => {
		cancelled = true;
		desktopQuery.removeEventListener("change", onBreakpointChange);
		dispose?.();
		dispose = null;
	};
}

export function teardownHomeSmoothScroll(): void {
	deactivate();
}
