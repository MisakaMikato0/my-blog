const HOME_ROOT_SELECTOR = ".home-page";

export type HomeLayerHooks = {
	id: string;
	boot: () => void;
	teardown?: () => void;
};

export function bindHomeLayer({ id, boot, teardown }: HomeLayerHooks): void {
	const key = `__home_layer_bound_${id}`;
	// Astro may re-evaluate a persistent script after a Swup navigation. Keep
	// one controller per layer rather than accumulating document listeners.
	const globalState = window as typeof window & { [key: string]: boolean };
	if (globalState[key]) return;
	globalState[key] = true;
	let bootedRoot: Element | null = null;

	const mount = () => {
		const root = document.querySelector(HOME_ROOT_SELECTOR);
		if (!root || root === bootedRoot) return;
		bootedRoot = root;
		boot();
	};

	const unmount = () => {
		bootedRoot = null;
		teardown?.();
	};

	mount();
	document.addEventListener("astro:page-load", mount);
	document.addEventListener("astro:before-swap", unmount);
}
