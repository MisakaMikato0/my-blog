<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";

interface Props {
	/** Preferred image (e.g. current album cover, served locally) */
	preferredSrc?: string;
	/** Article cover random-image API URLs (generated at build time with seed) */
	apiUrls?: string[];
	/** Local fallback image when every candidate fails */
	fallback?: string;
}

let {
	preferredSrc = "",
	apiUrls = [],
	fallback = "/assets/images/aut.webp",
}: Props = $props();

let loading = false;

// Shared background layer reused across Swup navigations to avoid
// re-creating the DOM and re-requesting external APIs on every page swap
let sharedHost: HTMLDivElement | null = null;
let sharedImg: HTMLImageElement | null = null;
let sharedBtn: HTMLButtonElement | null = null;
let activeCount = 0;

function applyImg(src: string): void {
	if (!sharedImg) return;
	sharedImg.dataset.src = src;
	sharedImg.classList.remove("gallery-bg-loaded");
	sharedImg.src = src;
}

/**
 * Try candidates in order; fall back to `fallback` when all fail.
 */
function loadFrom(list: string[], start: number): void {
	if (!sharedImg) return;
	if (start >= list.length) {
		applyImg(fallback);
		loading = false;
		return;
	}
	const src = list[start];
	const probe = new Image();
	probe.onload = () => {
		applyImg(src);
		loading = false;
	};
	probe.onerror = () => loadFrom(list, start + 1);
	probe.src = src;
}

/**
 * Swap to a fresh background by re-requesting the API
 * (cache-busted with a timestamp parameter).
 */
function changeBackground(): void {
	if (loading || apiUrls.length === 0) return;
	loading = true;
	const t = Date.now();
	const fresh = apiUrls.map((u) => `${u}${u.includes("?") ? "&" : "?"}t=${t}`);
	loadFrom(fresh, 0);
}

onMount(() => {
	activeCount += 1;

	// Reuse the existing layer when present (during Swup transitions the old
	// component may unmount after the new one mounts)
	if (!sharedHost?.isConnected) {
		sharedHost = document.createElement("div");
		sharedHost.className = "gallery-bg-host";
		sharedHost.setAttribute("aria-hidden", "true");

		sharedImg = document.createElement("img");
		sharedImg.className = "gallery-bg-img";
		sharedImg.alt = "";
		sharedImg.decoding = "async";
		sharedImg.onload = () => sharedImg?.classList.add("gallery-bg-loaded");

		const overlay = document.createElement("div");
		overlay.className = "gallery-bg-overlay";

		sharedHost.append(sharedImg, overlay);
		document.body.appendChild(sharedHost);
		sharedBtn = null;
	}

	// Only show the "swap background" button when random-image APIs are configured
	if (!sharedBtn && apiUrls.length > 0) {
		sharedBtn = document.createElement("button");
		sharedBtn.type = "button";
		sharedBtn.className = "gallery-bg-switch";
		sharedBtn.title = i18n(I18nKey.galleryBackgroundChange);
		sharedBtn.setAttribute("aria-label", i18n(I18nKey.galleryBackgroundChange));
		sharedBtn.innerHTML =
			'<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-4.9L21 10"/><path d="M21 4v6h-6"/><path d="M20 12a8 8 0 0 1-14 4.9L3 14"/><path d="M3 20v-6h6"/></svg>';
		sharedBtn.addEventListener("click", changeBackground);
		document.body.appendChild(sharedBtn);
	}

	// When the page specifies a local cover, switch directly (fast, no probing);
	// otherwise keep the current background
	if (preferredSrc && sharedImg && sharedImg.dataset.src !== preferredSrc) {
		applyImg(preferredSrc);
	} else if (sharedImg && !sharedImg.dataset.src) {
		loadFrom([preferredSrc, ...apiUrls, fallback].filter(Boolean), 0);
	}

	return () => {
		activeCount -= 1;
		if (activeCount <= 0) {
			activeCount = 0;
			sharedBtn?.remove();
			sharedBtn = null;
			sharedHost?.remove();
			sharedHost = null;
			sharedImg = null;
		}
	};
});
</script>

<!-- The background layer is injected into document.body on the client; SSR outputs nothing -->
