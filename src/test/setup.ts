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
