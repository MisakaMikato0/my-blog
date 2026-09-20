import { afterEach, describe, expect, it, vi } from "vitest";
import { setupMusicPlayerWidget } from "./music-player-controller";

const widgetMarkup = `
	<div class="music-player music-player-widget">
		<button class="music-player__disc" type="button"></button>
		<img class="music-player__disc-img" alt="" />
		<p class="music-player__title"></p>
		<p class="music-player__artist"></p>
		<div class="music-player__progress">
			<div class="music-player__progress-bar"></div>
			<div class="music-player__progress-thumb"></div>
		</div>
		<span class="music-player__pill-label"></span>
		<button class="music-player__btn--mode" type="button"></button>
		<button class="music-player__btn--lyrics" type="button"></button>
		<button class="music-player__btn--playlist" type="button"></button>
		<button class="music-player__btn--prev" type="button"></button>
		<button class="music-player__btn--play" type="button"></button>
		<button class="music-player__btn--next" type="button"></button>
		<button class="music-player__btn--volume" type="button"></button>
		<div class="music-player__volume-track">
			<div class="music-player__volume-bar"></div>
		</div>
		<div class="music-player__playlist-list"></div>
	</div>
	<template id="music-player-item-template">
		<div class="music-player__track">
			<div class="music-player__track-cover-wrap">
				<img class="music-player__track-cover" alt="" />
				<div class="music-player__track-active"></div>
			</div>
			<div class="music-player__track-meta">
				<div class="music-player__track-title"></div>
				<div class="music-player__track-artist"></div>
			</div>
		</div>
	</template>
`;

afterEach(() => {
	document.body.innerHTML = "";
	window.__fireflyMusic = undefined;
});

describe("music player hover contract", () => {
	it("expands and opens the playlist on pointerenter, then hides on pointerleave", () => {
		document.body.innerHTML = widgetMarkup;
		const init = vi.fn().mockResolvedValue(undefined);
		window.__fireflyMusic = {
			init,
			getState: () => ({
				initialized: false,
				playlist: [],
				currentIndex: 0,
				track: null,
				isPlaying: false,
				playMode: 0,
				volume: 0.6,
				isMuted: false,
				currentTime: 0,
				duration: 0,
				progress: 0,
				currentTimeStr: "0:00",
				durationStr: "0:00",
				lyrics: [],
				lyricsStatus: "none",
				currentLrcIndex: -1,
				error: null,
				config: {},
			}),
			togglePlay: vi.fn(),
			playNext: vi.fn(),
			playPrev: vi.fn(),
			cyclePlayMode: vi.fn(),
			setVolume: vi.fn(),
			toggleMute: vi.fn(),
			seek: vi.fn(),
			seekToTime: vi.fn(),
			playTrackByIndex: vi.fn(),
			loadTrack: vi.fn(),
		};

		setupMusicPlayerWidget();
		const root = document.querySelector<HTMLElement>(".music-player-widget");
		expect(root).not.toBeNull();
		if (!root) return;

		root.dispatchEvent(new Event("pointerenter"));
		expect(root.dataset.state).toBe("bar");
		expect(root.dataset.panel).toBe("open");
		expect(init).toHaveBeenCalledTimes(1);

		root.dispatchEvent(new Event("pointerleave"));
		expect(root.dataset.state).toBe("disc");
		expect(root.dataset.panel).toBe("closed");
	});
});
