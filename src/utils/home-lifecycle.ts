const HOME_ROOT_SELECTOR = ".home-page";

export type HomeLayerHooks = {
	boot: () => void;
	teardown?: () => void;
};

export function bindHomeLayer({ boot, teardown }: HomeLayerHooks): void {
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
