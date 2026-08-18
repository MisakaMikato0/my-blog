import { gsap } from "gsap";

/**
 * Hero 标题的“风吹散落”文字动画（参考 docs/demo/gsap-wind-blown-text 的 Scatter random）。
 * 将宿主元素的文字拆成逐字符 span，字符从四散状态汇聚入场（entrance），
 * 或从自然状态随风飞散消失（scatter，用于嵌入滚动 scrub 时间线）。
 */

export type FlyTextOptions = {
	/** 风向角（度）：0 = 向右，90 = 向上 */
	windAngle?: number;
	/** 风力（px）：顺风向飞行距离 */
	windStrength?: number;
	/** 随机散布半径（px） */
	scatter?: number;
	/** 各轴最大旋转角（度） */
	maxRotation?: number;
	/** Z 轴最大位移（px） */
	depth?: number;
	/** 入场 stagger 窗口（秒） */
	stagger?: number;
	/** 随机种子：保证同尺寸重建时参数一致 */
	seed?: number;
};

export type FlyTextHandle = {
	readonly host: HTMLElement;
	/** 拆字并测量字符位置（需在字体加载完成后调用） */
	prepare(): void;
	/** 尺寸变化后重新测量（保留 DOM 结构语义，重建字符） */
	rebuild(): void;
	/** 散落 → 自然汇聚，时间驱动入场时间线（paused，由调用方播放） */
	buildEntrance(timeScale?: number): gsap.core.Timeline | null;
	/** 自然 → 风散消失，固定窗口时长，用于嵌入 scrub 时间线 */
	buildScatter(windowDuration?: number): gsap.core.Timeline | null;
	/** 自然 → 从右上角级联下落（字雨），用于第二层签名入场，嵌入 scrub 时间线 */
	buildRainEntrance(windowDuration?: number): gsap.core.Timeline | null;
	/** 直接设置字符为自然状态 */
	setNatural(): void;
	/** 订阅宿主布局变化（防抖后回调），返回取消函数 */
	onLayoutChange(callback: () => void): () => void;
	destroy(): void;
};

type CharMotion = {
	element: HTMLElement;
	/** 0-1：stagger 窗口内的随机起点 */
	startFraction: number;
	/** 0.72-1：占窗口时长的比例 */
	durationFraction: number;
	scatter: {
		x: number;
		y: number;
		z: number;
		rotationX: number;
		rotationY: number;
		rotationZ: number;
	};
};

const NATURAL = {
	x: 0,
	y: 0,
	z: 0,
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0,
	opacity: 1,
} as const;

function sfc32(seedA: number, seedB: number, seedC: number, seedD: number) {
	let a = seedA;
	let b = seedB;
	let c = seedC;
	let d = seedD;
	return () => {
		a |= 0;
		b |= 0;
		c |= 0;
		d |= 0;
		const t = (((a + b) | 0) + d) | 0;
		d = (d + 1) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		c = (c + t) | 0;
		return (t >>> 0) / 4294967296;
	};
}

function createSeededRandom(seed: number) {
	let s = seed >>> 0;
	const splitmix32 = () => {
		s = (s + 0x9e3779b9) | 0;
		let t = s ^ (s >>> 16);
		t = Math.imul(t, 0x21f0aaad);
		t = t ^ (t >>> 15);
		t = Math.imul(t, 0x735a2d97);
		return (t ^ (t >>> 15)) >>> 0;
	};
	const rand = sfc32(splitmix32(), splitmix32(), splitmix32(), splitmix32());
	for (let i = 0; i < 12; i++) rand();
	return rand;
}

export function createFlyText(
	host: HTMLElement,
	options: FlyTextOptions = {},
): FlyTextHandle {
	const config = {
		windAngle: 18,
		windStrength: 520,
		scatter: 110,
		maxRotation: 420,
		depth: 150,
		stagger: 0.7,
		seed: 42,
		...options,
	};

	let raw = "";
	let placeholder: HTMLSpanElement | null = null;
	let overlay: HTMLSpanElement | null = null;
	let chars: CharMotion[] = [];
	let destroyed = false;
	let resizeTimer = 0;
	let lastWidth = 0;
	let lastHeight = 0;
	let observerReady = false;
	const layoutListeners = new Set<() => void>();

	const observer = new ResizeObserver((entries) => {
		const box = entries[0]?.contentBoxSize?.[0];
		if (!box) return;
		// observe() 会立即派发一次初始回调，仅记录基准尺寸，不触发重建
		if (!observerReady) {
			observerReady = true;
			lastWidth = box.inlineSize;
			lastHeight = box.blockSize;
			return;
		}
		if (box.inlineSize === lastWidth && box.blockSize === lastHeight) return;
		lastWidth = box.inlineSize;
		lastHeight = box.blockSize;
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(() => {
			if (!destroyed) {
				layoutListeners.forEach((fn) => {
					fn();
				});
			}
		}, 200);
	});

	const measure = () => {
		if (!placeholder || !overlay || !raw) return;
		overlay.innerHTML = "";
		const random = createSeededRandom(config.seed);
		const hostRect = host.getBoundingClientRect();
		const textNode = placeholder.firstChild;
		if (!textNode) return;

		const rad = (config.windAngle * Math.PI) / 180;
		const windX = Math.cos(rad);
		const windY = -Math.sin(rad);
		const next: CharMotion[] = [];

		for (let i = 0; i < raw.length; i++) {
			if (raw[i] === " ") continue;

			const range = document.createRange();
			range.setStart(textNode, i);
			range.setEnd(textNode, i + 1);
			const rect = range.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) continue;

			const x = rect.left - hostRect.left;
			const y = rect.top - hostRect.top;
			const element = document.createElement("span");
			element.className = "home-hero__fly-char";
			element.textContent = raw[i];
			element.style.left = `${x.toFixed(2)}px`;
			element.style.top = `${y.toFixed(2)}px`;
			element.style.width = `${rect.width.toFixed(2)}px`;
			element.style.height = `${rect.height.toFixed(2)}px`;
			// 条纹渐变相位补偿：让字符内的图案与整段渲染时对齐
			element.style.setProperty("--home-hero-fly-bg-x", `${(-x).toFixed(2)}px`);
			element.style.setProperty("--home-hero-fly-bg-y", `${(-y).toFixed(2)}px`);
			overlay.appendChild(element);

			const angle = random() * Math.PI * 2;
			const distance = random() * config.scatter;
			next.push({
				element,
				startFraction: random(),
				durationFraction: 0.72 + random() * 0.28,
				scatter: {
					x: windX * config.windStrength + Math.cos(angle) * distance,
					y: windY * config.windStrength + Math.sin(angle) * distance,
					z: (random() * 2 - 1) * config.depth,
					rotationX: (random() * 2 - 1) * config.maxRotation,
					rotationY: (random() * 2 - 1) * config.maxRotation * 0.7,
					rotationZ: (random() * 2 - 1) * config.maxRotation * 0.3,
				},
			});
		}

		chars = next;
	};

	const prepare = () => {
		if (destroyed) return;
		raw = (host.textContent ?? "").replace(/\s+/g, " ").trim();
		if (!raw) return;

		host.classList.add("home-hero__fly-host");
		host.textContent = "";

		const srOnly = document.createElement("span");
		srOnly.className = "sr-only";
		srOnly.textContent = raw;

		placeholder = document.createElement("span");
		placeholder.className = "home-hero__fly-placeholder";
		placeholder.setAttribute("aria-hidden", "true");
		placeholder.textContent = raw;

		overlay = document.createElement("span");
		overlay.className = "home-hero__fly-overlay";
		overlay.setAttribute("aria-hidden", "true");

		host.appendChild(srOnly);
		host.appendChild(placeholder);
		host.appendChild(overlay);
		measure();
		observer.observe(host);
	};

	// 注意：返回的时间线不能是 paused 状态——被 add() 嵌入父时间线后，
	// paused 的子时间线不会随父时间线播放头驱动。
	const buildEntrance = (timeScale = 1) => {
		if (!chars.length) return null;
		const timeline = gsap.timeline();
		const staggerWindow = config.stagger * timeScale;
		for (const char of chars) {
			// 入场前字符隐藏在散落位，避免拆字完成后闪现
			gsap.set(char.element, {
				...char.scatter,
				opacity: 0,
				transformPerspective: 500,
			});
			timeline.fromTo(
				char.element,
				{ ...char.scatter, opacity: 0 },
				{
					...NATURAL,
					duration: timeScale,
					ease: "power3.out",
					immediateRender: false,
				},
				char.startFraction * staggerWindow,
			);
		}
		return timeline;
	};

	const buildScatter = (windowDuration = 0.12) => {
		if (!chars.length) return null;
		const timeline = gsap.timeline();
		gsap.set(
			chars.map((char) => char.element),
			{ transformPerspective: 500 },
		);
		for (const char of chars) {
			const duration = windowDuration * char.durationFraction;
			const start = (windowDuration - duration) * char.startFraction;
			timeline.fromTo(
				char.element,
				{ ...NATURAL },
				{
					...char.scatter,
					opacity: 0,
					duration,
					ease: "power3.in",
					immediateRender: false,
				},
				start,
			);
		}
		return timeline;
	};

	// 第二层台词的花瓣式入场：字符从视口右上角外出发，沿斜线向左下方飘落
	// （横向 power2.inOut 减速、纵向 power1.in 加速，形成弧线），带克制旋转与
	// 轻微漂移，像樱花瓣被风吹入画面；随 scrub 时间线可逆，落定回自然居中位置。
	const buildRainEntrance = (windowDuration = 0.8) => {
		if (!chars.length) return null;
		const timeline = gsap.timeline();
		const viewportWidth =
			window.innerWidth || document.documentElement.clientWidth || 0;
		const viewportHeight =
			window.innerHeight || document.documentElement.clientHeight || 0;
		const hostRect = host.getBoundingClientRect();
		const staggerWindow = windowDuration * 0.55;
		const random = createSeededRandom(config.seed ^ 0x6a09e667);

		for (const char of chars) {
			const charLeft = Number.parseFloat(char.element.style.left) || 0;
			const charTop = Number.parseFloat(char.element.style.top) || 0;
			const startX =
				(viewportWidth - hostRect.left - charLeft) * (0.9 + random() * 0.2);
			const startY = -(
				hostRect.top +
				charTop +
				viewportHeight * (0.04 + random() * 0.18)
			);
			// 克制旋转 ±15° + 水平漂移（花瓣被风吹的摆动）
			const rotation = (random() - 0.5) * 30;
			const drift = (random() - 0.5) * 46;
			const fallDuration = windowDuration * char.durationFraction * 0.82;
			const start = char.startFraction * staggerWindow;

			// 先落到隐藏起点，避免拆字完成后闪现
			gsap.set(char.element, {
				x: startX,
				y: startY,
				rotation,
				opacity: 0,
				transformPerspective: 500,
			});
			// 横向：从右上外向左下飘（先快后慢，弧线感）
			timeline.fromTo(
				char.element,
				{ x: startX },
				{
					x: drift,
					duration: fallDuration * 0.9,
					ease: "power2.inOut",
					immediateRender: false,
				},
				start,
			);
			// 纵向：下落加速（power1.in）
			timeline.fromTo(
				char.element,
				{ y: startY },
				{
					y: 7,
					duration: fallDuration,
					ease: "power1.in",
					immediateRender: false,
				},
				start,
			);
			// 旋转回正（花瓣落定前轻微摆动）
			timeline.fromTo(
				char.element,
				{ rotation },
				{
					rotation: 0,
					duration: fallDuration * 0.85,
					ease: "power2.out",
					immediateRender: false,
				},
				start,
			);
			// 淡入
			timeline.fromTo(
				char.element,
				{ opacity: 0 },
				{
					opacity: 1,
					duration: fallDuration * 0.45,
					ease: "power1.out",
					immediateRender: false,
				},
				start,
			);
			timeline.to(
				char.element,
				{ x: 0, y: 0, duration: 0.18, ease: "back.out(1.8)" },
				start + fallDuration,
			);
		}
		return timeline;
	};

	const setNatural = () => {
		for (const char of chars) {
			gsap.set(char.element, { ...NATURAL, transformPerspective: 500 });
		}
	};

	return {
		host,
		prepare,
		rebuild: measure,
		buildEntrance,
		buildScatter,
		buildRainEntrance,
		setNatural,
		onLayoutChange(callback) {
			layoutListeners.add(callback);
			return () => layoutListeners.delete(callback);
		},
		destroy() {
			destroyed = true;
			window.clearTimeout(resizeTimer);
			layoutListeners.clear();
			observer.disconnect();
		},
	};
}
