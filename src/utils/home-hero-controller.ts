import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HeroMosaicConfig } from "@/types/config";
import { createFlyText, type FlyTextHandle } from "@/utils/home-hero-fly-text";
import {
	getHeroMosaicCompletionTransform,
	getHeroMosaicPhase,
	getHeroPinEndDistance,
	getHeroRainOpacity,
	getHeroScrollProgress,
	getHeroTileDepth,
} from "@/utils/home-hero-motion";
import { initHomeHeroRain } from "@/utils/home-hero-rain";

gsap.registerPlugin(ScrollTrigger);

const TILE_DEPTH_AMPLITUDE = 24;
const SIGNATURE_REVEAL_TIME = 0.1;
let initialReloadHandled = false;

function resetHeroScrollOnReload() {
	if (initialReloadHandled) return false;
	initialReloadHandled = true;
	const navigation = performance.getEntriesByType("navigation")[0] as
		| PerformanceNavigationTiming
		| undefined;
	if (navigation?.type !== "reload") return false;

	history.scrollRestoration = "manual";
	ScrollTrigger.clearScrollMemory("manual");
	window.scrollTo(0, 0);
	return true;
}

type HeroRuntimeConfig = {
	mosaic: HeroMosaicConfig;
	rain: {
		enabled?: boolean;
		intensity?: number;
		color?: string;
	};
};

type TileState = {
	element: HTMLElement;
	image: HTMLElement | null;
	row: number;
	column: number;
	order: number;
	offsetX: number;
	offsetY: number;
	rotation: number;
	scale: number;
	blur: number;
	initiallyVisible: boolean;
};

type TileEntranceTransform = {
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	blur: number;
};

type TileIdleTransform = TileEntranceTransform;

function parseRuntimeConfig(hero: HTMLElement): HeroRuntimeConfig | null {
	try {
		return JSON.parse(hero.dataset.heroConfig ?? "") as HeroRuntimeConfig;
	} catch {
		return null;
	}
}

function readNumber(element: HTMLElement, key: string, fallback: number) {
	const value = Number.parseFloat(element.dataset[key] ?? "");
	return Number.isFinite(value) ? value : fallback;
}

function getTileStates(hero: HTMLElement): TileState[] {
	return Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-tile]")).map(
		(element) => ({
			element,
			image: element.querySelector<HTMLElement>(
				".home-hero__mosaic-tile-image",
			),
			row: readNumber(element, "row", 0),
			column: readNumber(element, "column", 0),
			order: readNumber(element, "order", 0),
			offsetX: readNumber(element, "offsetX", 0),
			offsetY: readNumber(element, "offsetY", 0),
			rotation: readNumber(element, "rotation", 0),
			scale: readNumber(element, "scale", 1),
			blur: readNumber(element, "blur", 0),
			initiallyVisible: element.dataset.idleVisible === "true",
		}),
	);
}

function setReducedMotionState(hero: HTMLElement) {
	hero.dataset.reducedMotion = "true";
	hero.dataset.layerActive = "true";
	document
		.querySelector(".home-page--motion-pending")
		?.classList.remove("home-page--motion-pending");
}

export function mountHomeHero() {
	const hero = document.querySelector<HTMLElement>("[data-home-hero]");
	if (!hero || hero.dataset.heroMounted === "true") return () => undefined;

	// 移动端只展示 CSS 提供的完整图，不创建 ScrollTrigger、雨幕、拼图或 pin。
	const mobileQuery = window.matchMedia("(max-width: 768px)");
	if (mobileQuery.matches) {
		document
			.querySelector(".home-page--motion-pending")
			?.classList.remove("home-page--motion-pending");
		const handleMobileChange = () => {
			window.dispatchEvent(new Event("astro:page-load"));
		};
		mobileQuery.addEventListener("change", handleMobileChange);
		return () => mobileQuery.removeEventListener("change", handleMobileChange);
	}

	const config = parseRuntimeConfig(hero);
	if (!config) return () => undefined;
	const resetAfterReload = resetHeroScrollOnReload();

	hero.dataset.heroMounted = "true";
	const rain = initHomeHeroRain(hero, config.rain);
	const reducedMotionQuery = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	);
	const title = hero.querySelector<HTMLElement>("[data-hero-title]");
	const contact = hero.querySelector<HTMLElement>("[data-hero-contact]");
	const occupation = hero.querySelector<HTMLElement>(".home-hero__occupation");
	const mosaic = hero.querySelector<HTMLElement>("[data-hero-mosaic]");
	const mosaicComplete = hero.querySelector<HTMLElement>(
		"[data-hero-mosaic-complete]",
	);
	const backdrop = hero.querySelector<HTMLElement>("[data-hero-backdrop]");
	const signature = hero.querySelector<HTMLElement>("[data-hero-signature]");
	const nextSection = hero.nextElementSibling as HTMLElement | null;
	const tiles = getTileStates(hero);
	let timeline: ReturnType<typeof gsap.timeline> | null = null;
	let idleTimer = 0;
	let idleTween: ReturnType<typeof gsap.timeline> | null = null;
	let tilesIntroTimeline: ReturnType<typeof gsap.timeline> | null = null;
	let textIntroTimeline: ReturnType<typeof gsap.timeline> | null = null;
	let tilesIntroDone = false;
	let flyHandles: FlyTextHandle[] = [];
	let contactScatterTimeline: ReturnType<typeof gsap.timeline> | null = null;
	let flyLayoutTimer = 0;
	let signatureHandle: FlyTextHandle | null = null;
	let signatureRainTimeline: ReturnType<typeof gsap.timeline> | null = null;
	let occupationTween: ReturnType<typeof gsap.to> | null = null;
	let idleHandoffCaptured = false;
	let heroScrollTrigger: ReturnType<typeof ScrollTrigger.create> | null = null;
	let scrollDriver: ReturnType<typeof gsap.to> | null = null;
	let activeTiles = new Set(
		tiles.filter((tile) => tile.initiallyVisible).map((tile) => tile.element),
	);
	document
		.querySelector(".home-page--motion-pending")
		?.classList.remove("home-page--motion-pending");
	const handleMobileChange = () => {
		window.dispatchEvent(new Event("astro:page-load"));
	};
	mobileQuery.addEventListener("change", handleMobileChange);

	const stopIdleRotation = () => {
		idleTimer = 0;
		idleTween?.kill();
		idleTween = null;
	};

	const getTileDepthProgress = (tile: TileState) => {
		const idleVisible = Math.max(1, config.mosaic.idleVisible);
		return idleVisible > 1
			? Math.min(1, (tile.order % idleVisible) / (idleVisible - 1))
			: 0;
	};

	const setTileDepth = (tile: TileState, depthProgress: number) => {
		if (!tile.image) return;
		const depth = getHeroTileDepth(depthProgress, TILE_DEPTH_AMPLITUDE);
		gsap.set(tile.image, {
			transform: `translateZ(${depth.z}px) rotateX(${depth.rotationX}deg) rotateY(${depth.rotationY}deg)`,
			"--home-hero-tile-z": `${depth.z}px`,
			"--home-hero-tile-shadow-opacity": depth.shadowOpacity,
		});
	};

	const startIdleRotation = () => {
		if (idleTimer || reducedMotionQuery.matches) return;
		const visibleTiles = tiles.filter((tile) => activeTiles.has(tile.element));
		if (visibleTiles.length === 0) return;
		idleTimer = 1;
		idleTween = gsap.timeline({
			repeat: -1,
			yoyo: true,
			defaults: { duration: 1.8, ease: "sine.inOut" },
		});
		visibleTiles.forEach((tile, index) => {
			if (!tile.image) return;
			const baseDepth = getTileDepthProgress(tile);
			const peakDepth = Math.min(1, baseDepth + 0.38);
			const depth = getHeroTileDepth(peakDepth, TILE_DEPTH_AMPLITUDE);
			idleTween?.to(
				tile.image,
				{
					transform: `translateZ(${depth.z}px) rotateX(${depth.rotationX}deg) rotateY(${depth.rotationY}deg)`,
					"--home-hero-tile-z": `${depth.z}px`,
					"--home-hero-tile-shadow-opacity": depth.shadowOpacity,
				},
				index * 0.08,
			);
		});
	};

	const resetIdleTiles = () => {
		activeTiles = new Set(
			tiles.filter((tile) => tile.initiallyVisible).map((tile) => tile.element),
		);
		tiles.forEach((tile) => {
			const transform = tile.initiallyVisible
				? getTileIdleTransform(tile)
				: getTileEntranceTransform(tile);
			gsap.set(tile.element, {
				x: transform.x,
				y: transform.y,
				rotation: transform.rotation,
				scaleX: transform.scaleX,
				scaleY: transform.scaleY,
				filter: `blur(${transform.blur}px)`,
				autoAlpha: tile.initiallyVisible ? 1 : 0,
			});
			setTileDepth(tile, getTileDepthProgress(tile));
		});
	};

	// 用户开始滚动时立即完成进行中的入场动画，交由 scrub 时间线接管
	const completePendingIntros = () => {
		if (tilesIntroTimeline) {
			tilesIntroTimeline.progress(1);
			tilesIntroTimeline = null;
		}
		if (textIntroTimeline) {
			textIntroTimeline.progress(1);
			textIntroTimeline.kill();
			textIntroTimeline = null;
		}
	};

	const updateSceneState = (progress: number) => {
		const normalizedProgress = Math.min(1, Math.max(0, progress));
		const { phase } = getHeroMosaicPhase(normalizedProgress);
		const rainOpacity = getHeroRainOpacity(normalizedProgress);
		const rainActive = rainOpacity > 0.001;
		const layerActive = phase !== "flatten";
		hero.dataset.layerActive = String(layerActive);
		rain.setActive(rainActive && !reducedMotionQuery.matches);
		rain.setOpacity(rainOpacity);
		if (normalizedProgress > 0.0001) {
			if (!idleHandoffCaptured) {
				stopIdleRotation();
				idleHandoffCaptured = true;
				timeline?.invalidate();
			}
			stopIdleRotation();
			completePendingIntros();
		} else if (!idleTimer && tilesIntroDone) {
			resetIdleTiles();
			idleHandoffCaptured = false;
			startIdleRotation();
		}
	};

	const getTileEntranceTransform = (tile: TileState): TileEntranceTransform => {
		const horizontalRange = Math.max(
			hero.clientWidth * (mobileQuery.matches ? 0.22 : 0.29),
			mosaic?.offsetWidth ? mosaic.offsetWidth * 0.48 : 0,
		);
		const verticalRange = Math.max(
			hero.clientHeight * (mobileQuery.matches ? 0.16 : 0.24),
			mosaic?.offsetHeight ? mosaic.offsetHeight * 0.78 : 0,
		);
		const blurBase = mobileQuery.matches ? 8 : 13;
		const blurRange = mobileQuery.matches ? 6 : 10;
		const normalizedX = tile.offsetX / 75;
		const normalizedY = tile.offsetY / 57.5;
		const distance = Math.hypot(normalizedX, normalizedY);
		const minimumTravel = 0.52;
		const travelMultiplier =
			distance > 0 && distance < minimumTravel ? minimumTravel / distance : 1;

		return {
			x: normalizedX * travelMultiplier * horizontalRange,
			y: normalizedY * travelMultiplier * verticalRange,
			rotation: tile.rotation * 0.12,
			scaleX: 0.66 + Math.min(0.16, Math.max(0, (tile.scale - 0.72) * 0.48)),
			scaleY: 0.66 + Math.min(0.16, Math.max(0, (tile.scale - 0.72) * 0.48)),
			blur: blurBase + (tile.blur / 5) * blurRange,
		};
	};

	const getTileIdleTransform = (tile: TileState): TileIdleTransform => {
		const mosaicWidth = mosaic?.offsetWidth ?? hero.clientWidth * 0.84;
		const mosaicHeight = mosaic?.offsetHeight ?? hero.clientHeight * 0.72;
		const idleVisible = Math.max(1, config.mosaic.idleVisible);
		const depth = tile.order % idleVisible;
		const depthProgress = idleVisible > 1 ? depth / (idleVisible - 1) : 0;
		const normalizedX = (tile.offsetX + 75) / 150;
		const normalizedY = (tile.offsetY + 57.5) / 115;
		const targetX = mosaicWidth * (0.04 + normalizedX * 0.92);
		const targetY = mosaicHeight * (0.3 + normalizedY * 0.62);
		const tileCenterX =
			((tile.column + 0.5) / config.mosaic.columns) * mosaicWidth;
		const tileCenterY = ((tile.row + 0.5) / config.mosaic.rows) * mosaicHeight;

		return {
			x: targetX - tileCenterX,
			y: targetY - tileCenterY,
			rotation: tile.rotation,
			scaleX: 1.18 - depthProgress * 0.38,
			scaleY: 1.18 - depthProgress * 0.38,
			blur: depthProgress * 7,
		};
	};

	const buildTimeline = () => {
		if (!title || !mosaic || tiles.length === 0) return;

		gsap.set(mosaic, { xPercent: -50, y: 0, scaleX: 1, scaleY: 1 });
		gsap.set(mosaicComplete, { autoAlpha: 0 });
		if (signature) gsap.set(signature, { autoAlpha: 0 });
		for (const tile of tiles) {
			const transform = tile.initiallyVisible
				? getTileIdleTransform(tile)
				: getTileEntranceTransform(tile);
			gsap.set(tile.element, {
				x: transform.x,
				y: transform.y,
				rotation: transform.rotation,
				scaleX: transform.scaleX,
				scaleY: transform.scaleY,
				filter: `blur(${transform.blur}px)`,
				autoAlpha: tile.initiallyVisible ? 1 : 0,
			});
			setTileDepth(tile, getTileDepthProgress(tile));
		}

		timeline = gsap.timeline({
			defaults: { ease: "none" },
			paused: true,
		});

		timeline.to({}, { duration: 0.1 });
		timeline.to({}, { duration: 0.4 });
		timeline.to({}, { duration: 0.15 });
		timeline.to({}, { duration: 0.25 });
		timeline.to({}, { duration: 0.1 });
		for (const tile of tiles) {
			if (!tile.image) continue;
			timeline.to(
				tile.image,
				{
					transform: "translateZ(0px) rotateX(0deg) rotateY(0deg)",
					"--home-hero-tile-z": "0px",
					"--home-hero-tile-shadow-opacity": 0,
					duration: 0.1,
					ease: "power2.inOut",
				},
				0,
			);
		}

		const assemblyStagger = Math.min(
			0.02,
			0.22 / Math.max(1, tiles.length - 1),
		);
		const assemblyDuration = Math.max(
			0.08,
			0.4 - assemblyStagger * Math.max(0, tiles.length - 1),
		);
		timeline.to(
			tiles.map((tile) => tile.element),
			{
				x: 0,
				y: 0,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				filter: "blur(0px)",
				autoAlpha: 1,
				duration: assemblyDuration,
				ease: "power3.inOut",
				stagger: assemblyStagger,
			},
			0.1,
		);

		if (mosaicComplete) {
			timeline.to(
				mosaicComplete,
				{ autoAlpha: 1, duration: 0.03, ease: "none" },
				0.5,
			);
		}

		timeline.to(
			title,
			{
				autoAlpha: 0,
				duration: 0.2,
				ease: "power2.in",
			},
			0.65,
		);
		for (const textLayer of [contact, signature]) {
			if (!textLayer) continue;
			timeline.to(
				textLayer,
				{ autoAlpha: 0, duration: 0.2, ease: "power2.in" },
				0.65,
			);
		}

		// 让拼合后的同一层图片连续放大到覆盖视口，不再在后段突然切换到另一张大图
		const getCompletionTransform = () =>
			getHeroMosaicCompletionTransform({
				heroWidth: hero.clientWidth,
				heroHeight: hero.clientHeight,
				mosaicWidth: mosaic.offsetWidth,
				mosaicHeight: mosaic.offsetHeight,
				mosaicTop: mosaic.offsetTop,
			});
		timeline.to(
			mosaic,
			{
				y: () => getCompletionTransform().y,
				scaleX: () => getCompletionTransform().scale,
				scaleY: () => getCompletionTransform().scale,
				duration: 0.25,
				ease: "power3.inOut",
			},
			0.65,
		);

		// 最后 10% 不缩小图片，只让首屏整体淡出；下一段内容从下方平滑进入。
		timeline.to(
			hero,
			{ autoAlpha: 0, duration: 0.1, ease: "power1.inOut" },
			0.9,
		);
		if (nextSection) {
			gsap.set(nextSection, { autoAlpha: 0, yPercent: 10 });
			timeline.to(
				nextSection,
				{ autoAlpha: 1, yPercent: 0, duration: 0.1, ease: "power1.out" },
				0.9,
			);
		}

		const getScrollDistance = () =>
			mobileQuery.matches
				? getHeroPinEndDistance(
						config.mosaic.mobileScrollDistance,
						window.innerHeight,
						config.mosaic.mobileMinViewports,
					)
				: getHeroPinEndDistance(
						config.mosaic.desktopScrollDistance,
						window.innerHeight,
						config.mosaic.desktopMinViewports,
					);

		const renderTimelineForScroll = (scrollProgress: number) => {
			const progress = getHeroScrollProgress(scrollProgress);
			timeline?.totalProgress(progress);
			updateSceneState(progress);
		};

		const invalidateTimelineFromInitialState = () => {
			if (!timeline) return;
			const progress = timeline.totalProgress();
			// GSAP 的 to tween 会以 invalidate 时的当前值作为起点，先回到初始帧才能保留原始起点。
			timeline.totalProgress(0, true);
			timeline.invalidate();
			timeline.totalProgress(progress, true);
		};

		const scrollState = { progress: 0 };
		scrollDriver = gsap.to(scrollState, {
			progress: 1,
			duration: 1,
			ease: "none",
			paused: true,
			onUpdate: () => renderTimelineForScroll(scrollState.progress),
		});

		heroScrollTrigger = ScrollTrigger.create({
			id: "home-hero-two-layer",
			trigger: hero,
			start: "top top",
			end: () => `+=${getScrollDistance()}`,
			pin: hero,
			pinSpacing: true,
			scrub: config.mosaic.scrub,
			anticipatePin: 1,
			animation: scrollDriver,
			invalidateOnRefresh: true,
			onRefreshInit: invalidateTimelineFromInitialState,
			onRefresh: (self) => {
				self.update();
				renderTimelineForScroll(scrollDriver?.progress() ?? self.progress);
			},
			onUpdate: (self) => {
				if (!scrollDriver) renderTimelineForScroll(self.progress);
			},
		});

		renderTimelineForScroll(heroScrollTrigger.progress);
		ScrollTrigger.refresh();
	};

	// 初始可见碎片改为渐入，完成后进入常规 idle 轮换
	const playTilesIntro = () => {
		const idleTiles = tiles.filter((tile) => tile.initiallyVisible);
		if (!idleTiles.length) {
			tilesIntroDone = true;
			return;
		}
		tilesIntroTimeline = gsap.timeline({
			onComplete: () => {
				tilesIntroTimeline = null;
				tilesIntroDone = true;
				if (
					(heroScrollTrigger?.progress ?? 0) <= 0.002 &&
					!reducedMotionQuery.matches &&
					!idleTimer
				) {
					startIdleRotation();
				}
			},
		});
		for (const tile of idleTiles) {
			const transform = getTileIdleTransform(tile);
			tilesIntroTimeline.fromTo(
				tile.element,
				{
					y: transform.y + 24,
					scaleX: transform.scaleX * 0.92,
					scaleY: transform.scaleY * 0.92,
					filter: `blur(${transform.blur + 5}px)`,
					autoAlpha: 0,
				},
				{
					y: transform.y,
					scaleX: transform.scaleX,
					scaleY: transform.scaleY,
					filter: `blur(${transform.blur}px)`,
					autoAlpha: 1,
					duration: 0.85,
					ease: "power2.out",
					immediateRender: true,
				},
				0.06 + tile.order * 0.05,
			);
		}
	};

	// 左上角标题与右下角 contact：Scatter random 入场；contact 下滑时字符风散退场
	const prepareFlyText = () => {
		const titleHost = hero.querySelector<HTMLElement>(
			".home-hero__title > span:first-child",
		);
		const contactHosts = contact
			? [
					hero.querySelector<HTMLElement>(".home-hero__contact-platform"),
					hero.querySelector<HTMLElement>(".home-hero__contact-handle"),
				]
			: [];
		const hosts = [titleHost, ...contactHosts].filter(
			(host): host is HTMLElement => host !== null,
		);
		if (!hosts.length && !signature) return;

		// 字体就绪前先隐藏，避免拆字前闪现原始整段文字
		hosts.forEach((host) => {
			gsap.set(host, { autoAlpha: 0 });
		});
		if (occupation) gsap.set(occupation, { autoAlpha: 0, y: 14 });

		const mountContactScatter = () => {
			if (!timeline || flyHandles.length < 2) return;
			if (contactScatterTimeline) timeline.remove(contactScatterTimeline);
			const scatter = gsap.timeline();
			for (const handle of flyHandles.slice(1)) {
				const tl = handle.buildScatter(0.12);
				if (tl) scatter.add(tl, 0);
			}
			contactScatterTimeline = scatter;
			timeline.add(scatter, 0.04);
		};

		const mountSignatureRain = () => {
			if (!timeline || !signatureHandle) return;
			if (signatureRainTimeline) timeline.remove(signatureRainTimeline);
			const rainTimeline = signatureHandle.buildRainEntrance(0.8);
			if (!rainTimeline) return;
			signatureRainTimeline = rainTimeline;
			timeline.add(rainTimeline, SIGNATURE_REVEAL_TIME);
		};

		const handleFlyLayoutChange = () => {
			window.clearTimeout(flyLayoutTimer);
			flyLayoutTimer = window.setTimeout(() => {
				if (hero.dataset.heroMounted !== "true") return;
				for (const handle of flyHandles) handle.rebuild();
				flyHandles[0]?.setNatural();
				mountContactScatter();
				signatureHandle?.rebuild();
				mountSignatureRain();
			}, 200);
		};

		document.fonts.ready.then(() => {
			if (hero.dataset.heroMounted !== "true") return;
			flyHandles = hosts.map((host) => createFlyText(host));
			for (const handle of flyHandles) {
				handle.prepare();
				handle.onLayoutChange(handleFlyLayoutChange);
			}
			if (signature) {
				signatureHandle = createFlyText(signature);
				signatureHandle.prepare();
				signatureHandle.onLayoutChange(handleFlyLayoutChange);
				gsap.set(signature, { autoAlpha: 1 });
			}
			hosts.forEach((host) => {
				gsap.set(host, { autoAlpha: 1 });
			});

			mountContactScatter();
			mountSignatureRain();

			const progress = heroScrollTrigger?.progress ?? 0;
			if (progress <= 0.01) {
				const intro = gsap.timeline();
				const titleEntrance = flyHandles[0]?.buildEntrance(0.8);
				if (titleEntrance) intro.add(titleEntrance, 0.05);
				const contactEntrances = flyHandles
					.slice(1)
					.map((handle) => handle.buildEntrance(0.8))
					.filter((tl): tl is ReturnType<typeof gsap.timeline> => tl !== null);
				contactEntrances.forEach((tl, index) => {
					intro.add(tl, 0.22 + index * 0.05);
				});
				textIntroTimeline = intro;
			} else {
				for (const handle of flyHandles) handle.setNatural();
			}

			if (occupation) {
				occupationTween = gsap.to(occupation, {
					autoAlpha: 1,
					y: 0,
					duration: 0.7,
					ease: "power2.out",
					delay: 0.5,
				});
			}
		});
	};

	if (reducedMotionQuery.matches) {
		setReducedMotionState(hero);
		if (backdrop) gsap.set(backdrop, { autoAlpha: 1 });
	} else {
		buildTimeline();
		playTilesIntro();
		prepareFlyText();
	}

	if (resetAfterReload) {
		requestAnimationFrame(() => {
			window.scrollTo(0, 0);
			timeline?.totalProgress(0);
			scrollDriver?.progress(0);
			updateSceneState(0);
			ScrollTrigger.refresh();
			history.scrollRestoration = "auto";
		});
	}

	const restoreInitialState = () => {
		const animatedElements = [
			mosaic,
			mosaicComplete,
			backdrop,
			title,
			contact,
			signature,
			...tiles.map((tile) => tile.element),
			...tiles.flatMap((tile) => (tile.image ? [tile.image] : [])),
			occupation,
			nextSection,
		].filter((element): element is HTMLElement => element !== null);
		gsap.killTweensOf(animatedElements);
		if (mosaic) gsap.set(mosaic, { xPercent: -50, y: 0, scaleX: 1, scaleY: 1 });
		if (mosaicComplete) gsap.set(mosaicComplete, { autoAlpha: 0 });
		if (backdrop) gsap.set(backdrop, { clearProps: "opacity,visibility" });
		if (title) gsap.set(title, { clearProps: "opacity,visibility" });
		if (contact) gsap.set(contact, { clearProps: "opacity,visibility" });
		if (signature) gsap.set(signature, { clearProps: "opacity,visibility" });
		if (nextSection)
			gsap.set(nextSection, { clearProps: "opacity,visibility,transform" });
		resetIdleTiles();
	};

	return () => {
		stopIdleRotation();
		window.clearTimeout(flyLayoutTimer);
		tilesIntroTimeline?.kill();
		tilesIntroTimeline = null;
		textIntroTimeline?.kill();
		textIntroTimeline = null;
		occupationTween?.kill();
		occupationTween = null;
		for (const handle of flyHandles) handle.destroy();
		flyHandles = [];
		contactScatterTimeline = null;
		signatureRainTimeline = null;
		signatureHandle?.destroy();
		signatureHandle = null;
		rain.setActive(false);
		rain.destroy();
		heroScrollTrigger?.kill();
		heroScrollTrigger = null;
		scrollDriver?.kill();
		scrollDriver = null;
		timeline?.kill();
		timeline = null;
		restoreInitialState();
		delete hero.dataset.heroMounted;
		delete hero.dataset.layerActive;
		delete hero.dataset.reducedMotion;
		mobileQuery.removeEventListener("change", handleMobileChange);
	};
}
