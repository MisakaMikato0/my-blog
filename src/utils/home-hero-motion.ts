export type HeroTileLayout = {
	index: number;
	row: number;
	column: number;
	order: number;
	offsetX: number;
	offsetY: number;
	rotation: number;
	scale: number;
	blur: number;
	idleDepth: number;
	initiallyVisible: boolean;
};

type HeroTileLayoutOptions = {
	rows: number;
	columns: number;
	idleVisible: number;
	seed: number;
};

export const HeroMosaicScrollPhase = {
	flatten: 0.1,
	assemble: 0.4,
	hold: 0.15,
	zoom: 0.25,
	exit: 0.1,
} as const;

export function getHeroScrollProgress(progress: number) {
	if (Number.isNaN(progress) || progress === Number.NEGATIVE_INFINITY) return 0;
	if (progress === Number.POSITIVE_INFINITY) return 1;
	return Math.min(1, Math.max(0, progress));
}

type HeroMosaicPhase = keyof typeof HeroMosaicScrollPhase;

export function getHeroMosaicPhase(progress: number): {
	phase: HeroMosaicPhase;
	localProgress: number;
} {
	const clampedProgress = getHeroScrollProgress(progress);
	let phaseStart = 0;

	for (const [phase, duration] of Object.entries(HeroMosaicScrollPhase) as [
		HeroMosaicPhase,
		number,
	][]) {
		const phaseEnd = phaseStart + duration;
		if (clampedProgress < phaseEnd || phase === "exit") {
			return {
				phase,
				localProgress: Number(
					((clampedProgress - phaseStart) / duration).toFixed(12),
				),
			};
		}
		phaseStart = phaseEnd;
	}

	return { phase: "exit", localProgress: 1 };
}

export function getHeroRainOpacity(progress: number) {
	const { phase, localProgress } = getHeroMosaicPhase(progress);
	if (phase === "zoom") return 1 - localProgress;
	if (phase === "exit") return 0;
	return 1;
}

export function getHeroTileDepth(depth: number, amplitude: number) {
	const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0;
	const safeAmplitude = Number.isFinite(amplitude) ? Math.max(0, amplitude) : 0;

	return {
		z: safeDepth * safeAmplitude,
		rotationX: safeDepth * 4,
		rotationY: safeDepth * -4,
		shadowOpacity: safeDepth * 0.34,
	};
}

function createSeededRandom(seed: number) {
	let value = seed >>> 0;
	return () => {
		value += 0x6d2b79f5;
		let result = value;
		result = Math.imul(result ^ (result >>> 15), result | 1);
		result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
		return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
	};
}

export function createHeroTileLayout({
	rows,
	columns,
	idleVisible,
	seed,
}: HeroTileLayoutOptions): HeroTileLayout[] {
	const tileCount = Math.max(1, rows * columns);
	const random = createSeededRandom(seed);
	const order = Array.from({ length: tileCount }, (_, index) => index);

	for (let index = order.length - 1; index > 0; index--) {
		const swapIndex = Math.floor(random() * (index + 1));
		[order[index], order[swapIndex]] = [order[swapIndex], order[index]];
	}

	const revealOrder = new Map(
		order.map((tileIndex, index) => [tileIndex, index]),
	);
	return Array.from({ length: tileCount }, (_, index) => {
		const rank = revealOrder.get(index) ?? index;
		const initiallyVisible =
			rank < Math.min(tileCount, Math.max(1, idleVisible));
		const idleDepth = initiallyVisible ? rank : idleVisible;
		const idleProgress =
			Math.min(tileCount, Math.max(1, idleVisible)) > 1
				? idleDepth / (Math.min(tileCount, Math.max(1, idleVisible)) - 1)
				: 0;
		return {
			index,
			row: Math.floor(index / columns),
			column: index % columns,
			order: rank,
			offsetX: Number(((random() - 0.5) * 150).toFixed(3)),
			offsetY: Number(((random() - 0.5) * 115).toFixed(3)),
			rotation: Number(((random() - 0.5) * 18).toFixed(3)),
			scale: Number(
				(initiallyVisible
					? 1.18 - idleProgress * 0.38
					: 0.72 + random() * 0.34
				).toFixed(3),
			),
			blur: Number(
				(initiallyVisible ? idleProgress * 7 : random() * 5).toFixed(3),
			),
			idleDepth,
			initiallyVisible,
		};
	});
}

export type HeroMosaicCompletionMetrics = {
	heroWidth: number;
	heroHeight: number;
	mosaicWidth: number;
	mosaicHeight: number;
	mosaicTop: number;
};

export function getHeroMosaicCompletionTransform({
	heroWidth,
	heroHeight,
	mosaicWidth,
	mosaicHeight,
	mosaicTop,
}: HeroMosaicCompletionMetrics) {
	const safeMosaicWidth = Math.max(1, mosaicWidth);
	const safeMosaicHeight = Math.max(1, mosaicHeight);
	return {
		y: heroHeight / 2 - (mosaicTop + safeMosaicHeight / 2),
		scale: Math.max(heroWidth / safeMosaicWidth, heroHeight / safeMosaicHeight),
	};
}

export function getHeroPinEndDistance(
	configuredDistance: number,
	viewportHeight: number,
	minimumViewports: number,
) {
	const configured = Number.isFinite(configuredDistance)
		? Math.max(0, configuredDistance)
		: 0;
	const viewport = Number.isFinite(viewportHeight)
		? Math.max(0, viewportHeight)
		: 0;
	const minViewports = Number.isFinite(minimumViewports)
		? Math.max(0, minimumViewports)
		: 0;
	return Math.max(0, configured, Math.round(viewport * minViewports));
}
