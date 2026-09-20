import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("music player wheel scroll contract", () => {
	it("lets the playlist scroll independently from the homepage Lenis instance", () => {
		const source = readSource("src/components/features/MusicPlayer.astro");
		const playlistTag = source.match(
			/<div\b(?=[^>]*class="[^"]*music-player__playlist-list)[^>]*>/,
		)?.[0];

		expect(playlistTag).toBeDefined();
		expect(playlistTag).toContain("data-lenis-prevent");
	});
});
