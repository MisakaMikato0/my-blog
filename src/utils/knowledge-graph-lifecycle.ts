type KnowledgeGraphLifecycleHooks = {
	mount: (root: HTMLElement) => void;
	teardown: () => void;
};

const ROOT_SELECTOR = "[data-kg-root]";
const BOUND_KEY = "__knowledge_graph_lifecycle_bound";

/**
 * Keeps the graph controller aligned with Astro's replaceable-page lifecycle.
 * The guard survives persistent script re-evaluation, so document listeners
 * remain singular while each replacement root is mounted once.
 */
export function bindKnowledgeGraphLifecycle({
	mount,
	teardown,
}: KnowledgeGraphLifecycleHooks): void {
	const state = window as typeof window & Record<string, boolean | undefined>;
	if (state[BOUND_KEY]) return;
	state[BOUND_KEY] = true;

	let mountedRoot: HTMLElement | null = null;

	const mountCurrentRoot = (): void => {
		const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
		if (!root || root === mountedRoot) return;
		mountedRoot = root;
		mount(root);
	};

	const unmountCurrentRoot = (): void => {
		if (!mountedRoot) return;
		mountedRoot = null;
		teardown();
	};

	mountCurrentRoot();
	document.addEventListener("astro:page-load", mountCurrentRoot);
	document.addEventListener("astro:before-swap", unmountCurrentRoot);
}
