import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HeroMosaicConfig } from "@/types/config";
import { createFlyText, type FlyTextHandle } from "@/utils/home-hero-fly-text";
import { getHeroPinEndDistance } from "@/utils/home-hero-motion";
import { initHomeHeroRain } from "@/utils/home-hero-rain";

gsap.registerPlugin(ScrollTrigger);

const RAIN_ACTIVATE_TIME = 0.99;
const SIGNATURE_REVEAL_TIME = 1.02;
const INTERACTION_HOLD_START = 2.35;
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

function createSeededRandom(seed: number) {
	let value = seed >>> 0;
	return () => {
		value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
		return value / 4294967296;
	};
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
	const random = createSeededRandom(config.mosaic.seed ^ 0x9e3779b9);
	document
		.querySelector(".home-page--motion-pending")
		?.classList.remove("home-page--motion-pending");
	const handleMobileChange = () => {
		window.dispatchEvent(new Event("astro:page-load"));
	};
	mobileQuery.addEventListener("change", handleMobileChange);

	const stopIdleRotation = () => {
		window.clearInterval(idleTimer);
		idleTimer = 0;
		idleTween?.kill();
		idleTween = null;
	};

	const startIdleRotation = () => {
		if (idleTimer || reducedMotionQuery.matches) return;
		idleTimer = window.setInterval(() => {
			const visible = tiles.filter((tile) => activeTiles.has(tile.element));
			const hidden = tiles.filter((tile) => !activeTiles.has(tile.element));
			if (visible.length === 0 || hidden.length === 0) return;
			const leaving = visible[Math.floor(random() * visible.length)];
			const entering = hidden[Math.floor(random() * hidden.length)];
			const enteringTransform = getTileIdleTransform(entering);
			activeTiles.delete(leaving.element);
			activeTiles.add(entering.element);
			idleTween?.kill();
			idleTween = gsap.timeline();
			idleTween.to(
				leaving.element,
				{ autoAlpha: 0, duration: 0.38, ease: "power2.inOut" },
				0,
			);
			idleTween.fromTo(
				entering.element,
				{
					x: enteringTransform.x,
					y: enteringTransform.y,
					rotation: enteringTransform.rotation,
					scaleX: enteringTransform.scaleX * 0.88,
					scaleY: enteringTransform.scaleY * 0.88,
					filter: `blur(${enteringTransform.blur}px)`,
					autoAlpha: 0,
				},
				{
					autoAlpha: 1,
					scaleX: enteringTransform.scaleX,
					scaleY: enteringTransform.scaleY,
					duration: 0.48,
					ease: "power3.out",
				},
				0.12,
			);
		}, config.mosaic.idleInterval);
	};

	const resetIdleTiles = () => {
		activeTiles = new Set(
			tiles.filter((tile) => tile.initiallyVisible).map((tile) => tile.element),
		);
		tiles.forEach((tile) => {
			const transform = tile.initiallyVisible
				? getTileInitialTransform(tile)
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
		const timelineTime = normalizedProgress * (timeline?.duration() ?? 1);
		const rainActive = timelineTime >= RAIN_ACTIVATE_TIME;
		const layerActive = timelineTime >= SIGNATURE_REVEAL_TIME;
		hero.dataset.layerActive = String(layerActive);
		rain.setActive(rainActive && !reducedMotionQuery.matches);
		if (normalizedProgress > 0.002) {
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

	const getMosaicTransform = () => {
		if (!mosaic) return { y: 0, scale: 1 };
		const heroWidth = hero.clientWidth;
		const heroHeight = hero.clientHeight;
		const mosaicWidth = mosaic.offsetWidth;
		const mosaicHeight = mosaic.offsetHeight;
		const mosaicCenterY = mosaic.offsetTop + mosaicHeight / 2;
		return {
			y: heroHeight / 2 - mosaicCenterY,
			scale:
				Math.max(
					heroWidth / Math.max(1, mosaicWidth),
					heroHeight / Math.max(1, mosaicHeight),
				) * 1.015,
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

	// 首屏布局只服务于第一次静止展示；进入轮换后仍回到上面的随机布局。
	const getTileInitialTransform = (tile: TileState): TileEntranceTransform => {
		const layout = config.mosaic.initialLayout?.[tile.order];
		if (mobileQuery.matches || !mosaic || !layout) {
			return getTileIdleTransform(tile);
		}

		const mosaicWidth = Math.max(1, mosaic.offsetWidth);
		const mosaicHeight = Math.max(1, mosaic.offsetHeight);
		const columns = Math.max(1, config.mosaic.columns);
		const rows = Math.max(1, config.mosaic.rows);
		const clampRatio = (value: number, fallback: number) =>
			Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
		const centerX = clampRatio(layout.x, 0.5) * mosaicWidth;
		const centerY = clampRatio(layout.y, 0.5) * mosaicHeight;
		const tileCenterX = ((tile.column + 0.5) / columns) * mosaicWidth;
		const tileCenterY = ((tile.row + 0.5) / rows) * mosaicHeight;
		const width = Math.max(0.01, clampRatio(layout.width, 1 / columns));
		const height = Math.max(0.01, clampRatio(layout.height, 1 / rows));
		const rotation =
			typeof layout.rotation === "number" && Number.isFinite(layout.rotation)
				? layout.rotation
				: 0;
		const blur = Number.isFinite(layout.blur)
			? Math.max(0, layout.blur ?? 0)
			: 0;

		return {
			x: centerX - tileCenterX,
			y: centerY - tileCenterY,
			rotation,
			scaleX: width * columns,
			scaleY: height * rows,
			blur,
		};
	};

	const buildTimeline = () => {
		if (!title || !mosaic || !backdrop || tiles.length === 0) return;

		gsap.set(mosaic, { xPercent: -50, y: 0, scaleX: 1, scaleY: 1 });
		gsap.set(mosaicComplete, { autoAlpha: 0 });
		gsap.set(backdrop, { autoAlpha: 0 });
		if (signature) gsap.set(signature, { autoAlpha: 0 });
		for (const tile of tiles) {
			const transform = tile.initiallyVisible
				? getTileInitialTransform(tile)
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
		}

		timeline = gsap.timeline({
			defaults: { ease: "none" },
			paused: true,
		});

		timeline.to({}, { duration: 1 });
		timeline.to(
			title,
			{
				yPercent: -20,
				scale: 0.58,
				transformOrigin: "0% 50%",
				duration: 0.1,
				ease: "power3.inOut",
			},
			0,
		);
		timeline.to(
			tiles.map((tile) => tile.element),
			{ autoAlpha: 0, duration: 0.06, ease: "power2.in" },
			0.04,
		);
		for (const tile of tiles) {
			const start = 0.1 + tile.order * 0.02;
			timeline.fromTo(
				tile.element,
				{
					x: () => getTileEntranceTransform(tile).x,
					y: () => getTileEntranceTransform(tile).y,
					rotation: () => getTileEntranceTransform(tile).rotation,
					scaleX: () => getTileEntranceTransform(tile).scaleX,
					scaleY: () => getTileEntranceTransform(tile).scaleY,
					filter: () => `blur(${getTileEntranceTransform(tile).blur}px)`,
					autoAlpha: 0,
				},
				{
					x: 0,
					y: 0,
					rotation: 0,
					scaleX: 1,
					scaleY: 1,
					filter: "blur(0px)",
					autoAlpha: 1,
					duration: 0.09,
					ease: "power3.inOut",
					immediateRender: false,
				},
				start,
			);
		}

		if (mosaicComplete) {
			timeline.to(
				mosaicComplete,
				{ autoAlpha: 1, duration: 0.03, ease: "none" },
				0.72,
			);
		}

		timeline.to(
			title,
			{
				autoAlpha: 0,
				yPercent: -28,
				duration: 0.08,
				ease: "power2.in",
			},
			0.72,
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
		timeline.to(
			mosaic,
			{
				y: () => getMosaicTransform().y,
				scaleX: () => getMosaicTransform().scale,
				scaleY: () => getMosaicTransform().scale,
				duration: 0.2,
				ease: "power3.inOut",
			},
			0.76,
		);
		timeline.to(
			backdrop,
			{ autoAlpha: 1, duration: 0.1, ease: "power2.inOut" },
			0.87,
		);
		timeline.to(
			mosaic,
			{ autoAlpha: 0, duration: 0.07, ease: "power2.in" },
			0.92,
		);
		timeline.to(
			{},
			{ duration: Math.max(0, config.mosaic.interactionHold) },
			INTERACTION_HOLD_START,
		);

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
			const progress = Math.min(1, Math.max(0, scrollProgress));
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
			const transform = getTileInitialTransform(tile);
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
