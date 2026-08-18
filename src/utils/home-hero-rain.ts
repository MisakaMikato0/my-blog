type RainConfig = {
	enabled?: boolean;
	intensity?: number;
	color?: string;
};

type RainDrop = {
	x: number;
	y: number;
	speed: number;
	alpha: number;
	/** 花瓣大小（px） */
	size: number;
	/** 花瓣旋转角（弧度） */
	rotation: number;
	/** 旋转速度（弧度/帧） */
	rotationSpeed: number;
	/** 水平摆动相位 */
	swayPhase: number;
	/** 水平摆动幅度（px） */
	swayAmplitude: number;
};

type SplashParticle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	radius: number;
	alpha: number;
};

type HitEdge = {
	x1: number;
	x2: number;
	y: number;
	captureRate: number;
};

export type HomeHeroRainController = {
	setActive: (active: boolean) => void;
	destroy: () => void;
};

function createDrop(width: number, height: number, initial = false): RainDrop {
	return {
		x: Math.random() * width,
		y: initial ? Math.random() * height : -40 - Math.random() * height * 0.3,
		speed: 2.2 + Math.random() * 3.4,
		alpha: 0.4 + Math.random() * 0.45,
		size: 7 + Math.random() * 9,
		rotation: Math.random() * Math.PI * 2,
		rotationSpeed: (Math.random() - 0.5) * 0.12,
		swayPhase: Math.random() * Math.PI * 2,
		swayAmplitude: 14 + Math.random() * 26,
	};
}

/** 用贝塞尔曲线绘制一片樱花花瓣（五瓣之一），已旋转到当前角度。 */
function drawPetal(
	context: CanvasRenderingContext2D,
	size: number,
	rotation: number,
) {
	context.save();
	context.rotate(rotation);
	// 花瓣：从原点出发，两段三次贝塞尔拼成一片花瓣形状（尖底 + 圆润瓣尖）
	const w = size;
	const h = size * 1.35;
	context.beginPath();
	context.moveTo(0, h * 0.45);
	context.bezierCurveTo(
		-w * 0.55,
		-h * 0.05,
		-w * 0.28,
		-h * 0.85,
		0,
		-h * 0.95,
	);
	context.bezierCurveTo(w * 0.28, -h * 0.85, w * 0.55, -h * 0.05, 0, h * 0.45);
	context.closePath();
	context.fill();
	context.restore();
}

function createSplash(x: number, y: number): SplashParticle {
	return {
		x,
		y: y - 1,
		vx: (Math.random() - 0.5) * 3.8,
		vy: -(1.4 + Math.random() * 3.4),
		life: 0,
		maxLife: 14 + Math.random() * 16,
		radius: 0.7 + Math.random() * 1.5,
		alpha: 0.24 + Math.random() * 0.32,
	};
}

export function initHomeHeroRain(
	hero: HTMLElement,
	config: RainConfig,
): HomeHeroRainController {
	const canvas = hero.querySelector<HTMLCanvasElement>("[data-hero-rain]");
	const context = canvas?.getContext("2d") ?? null;
	const abortController = new AbortController();
	const resizeObserver = new ResizeObserver(() => resize());
	const mobileQuery = window.matchMedia("(max-width: 768px)");
	const reducedMotionQuery = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	);
	let drops: RainDrop[] = [];
	let splashes: SplashParticle[] = [];
	let hitEdges: HitEdge[] = [];
	let animationFrame = 0;
	let frameCount = 0;
	let active = false;
	let width = 0;
	let height = 0;
	let dpr = 1;

	if (!canvas || !context || config.enabled === false) {
		return {
			setActive: () => undefined,
			destroy: () => abortController.abort(),
		};
	}

	function collectHitEdges() {
		hitEdges = [
			{ x1: 0, x2: width, y: Math.max(0, height - 1), captureRate: 1 },
		];
	}

	function resize() {
		if (!canvas || !context) return;
		const bounds = hero.getBoundingClientRect();
		width = Math.max(1, Math.round(bounds.width));
		height = Math.max(1, Math.round(bounds.height));
		dpr = mobileQuery.matches
			? 1
			: Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		context.setTransform(dpr, 0, 0, dpr, 0, 0);
		const intensity = Math.min(1, Math.max(0, config.intensity ?? 0.6));
		const areaScale = Math.min(1.4, (width * height) / 1_100_000);
		const baseCount = mobileQuery.matches ? 34 : 86;
		const count = Math.max(
			10,
			Math.round(baseCount * intensity * Math.max(0.65, areaScale)),
		);
		drops = Array.from({ length: count }, () =>
			createDrop(width, height, true),
		);
		splashes = [];
		collectHitEdges();
	}

	function resetDrop(drop: RainDrop) {
		Object.assign(drop, createDrop(width, height));
		drop.x = Math.random() * (width + 80);
	}

	function addSplash(x: number, y: number) {
		const particleCount = mobileQuery.matches ? 3 : 6;
		for (let index = 0; index < particleCount; index += 1) {
			splashes.push(createSplash(x, y));
		}
	}

	function stop() {
		cancelAnimationFrame(animationFrame);
		animationFrame = 0;
		context?.clearRect(0, 0, width, height);
	}

	function draw() {
		if (!context || !active || document.hidden || reducedMotionQuery.matches) {
			stop();
			return;
		}

		frameCount += 1;
		if (frameCount % 8 === 0) collectHitEdges();
		context.clearRect(0, 0, width, height);
		context.fillStyle = config.color || getComputedStyle(hero).color;

		for (const drop of drops) {
			const previousY = drop.y;
			// 花瓣横向：随帧摆动（sin 相位），形成飘落轨迹
			drop.swayPhase += 0.04;
			const swayX = Math.sin(drop.swayPhase) * drop.swayAmplitude * 0.06;
			drop.x += swayX - drop.speed * 0.06;
			drop.y += drop.speed;
			drop.rotation += drop.rotationSpeed;
			const collision = hitEdges.find(
				(edge) =>
					previousY <= edge.y &&
					drop.y >= edge.y &&
					drop.x >= edge.x1 &&
					drop.x <= edge.x2 &&
					(edge.captureRate >= 1 || Math.random() <= edge.captureRate),
			);
			if (collision) {
				addSplash(drop.x, collision.y);
				resetDrop(drop);
				continue;
			}
			if (drop.y - drop.size > height || drop.x < -drop.size) {
				resetDrop(drop);
				continue;
			}
			context.globalAlpha = drop.alpha;
			context.translate(drop.x, drop.y);
			drawPetal(context, drop.size, drop.rotation);
			context.translate(-drop.x, -drop.y);
		}

		for (let index = splashes.length - 1; index >= 0; index -= 1) {
			const particle = splashes[index];
			particle.life += 1;
			particle.vy += 0.18;
			particle.x += particle.vx;
			particle.y += particle.vy;
			const remaining = 1 - particle.life / particle.maxLife;
			if (remaining <= 0) {
				splashes.splice(index, 1);
				continue;
			}
			context.globalAlpha = particle.alpha * remaining;
			context.beginPath();
			context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
			context.fill();
		}

		context.globalAlpha = 1;
		animationFrame = requestAnimationFrame(draw);
	}

	function start() {
		if (
			animationFrame ||
			!active ||
			document.hidden ||
			reducedMotionQuery.matches
		) {
			return;
		}
		collectHitEdges();
		animationFrame = requestAnimationFrame(draw);
	}

	function handleVisibilityChange() {
		if (document.hidden) stop();
		else start();
	}

	function handleMediaChange() {
		resize();
		if (reducedMotionQuery.matches) stop();
		else start();
	}

	resize();
	resizeObserver.observe(hero);
	document.addEventListener("visibilitychange", handleVisibilityChange, {
		signal: abortController.signal,
	});
	mobileQuery.addEventListener("change", handleMediaChange, {
		signal: abortController.signal,
	});
	reducedMotionQuery.addEventListener("change", handleMediaChange, {
		signal: abortController.signal,
	});

	return {
		setActive(nextActive) {
			active = nextActive;
			canvas.classList.toggle("is-active", active);
			if (active) start();
			else stop();
		},
		destroy() {
			active = false;
			stop();
			resizeObserver.disconnect();
			abortController.abort();
			drops = [];
			splashes = [];
			hitEdges = [];
			canvas.classList.remove("is-active");
		},
	};
}
