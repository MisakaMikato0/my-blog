import { cleanup } from "@testing-library/svelte";
import { afterEach, vi } from "vitest";

afterEach(() => {
	cleanup();
});

// jsdom 没有 window.matchMedia，组件 onMount 依赖它。
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: true,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// requestAnimationFrame polyfill（动画路径兜底）
if (!window.requestAnimationFrame) {
	window.requestAnimationFrame = (callback) =>
		setTimeout(() => callback(performance.now()), 16) as unknown as number;
	window.cancelAnimationFrame = (handle) => clearTimeout(handle);
}

// Svelte 5 transition（fade 等）依赖 Element.animate，jsdom 未实现。
// 最小 polyfill：立即完成动画，并在 onfinish 赋值后自动触发回调，
// 这样 fade-out 结束能正常移除元素。
if (typeof Element.prototype.animate !== "function") {
	Element.prototype.animate = (
		_keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		options?: number | KeyframeAnimationOptions,
	) => {
		const duration =
			typeof options === "number"
				? options
				: ((options as KeyframeAnimationOptions | undefined)?.duration ?? 0);
		const anim: Record<string, unknown> = {
			finished: Promise.resolve(),
			play: () => {},
			cancel: () => {},
			pause: () => {},
			reverse: () => {},
			playbackRate: 1,
			effect: null,
			currentTime: duration,
			commitStyles: () => {},
			persist: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			finish: () => {},
		};
		// onfinish 被 Svelte 赋值后，下一轮微任务触发它，模拟动画立即完成
		let onfinish: (() => void) | null = null;
		Object.defineProperty(anim, "onfinish", {
			get: () => onfinish,
			set: (fn: (() => void) | null) => {
				onfinish = fn;
				if (fn) setTimeout(fn, 0);
			},
		});
		return anim as unknown as Animation;
	};
}
