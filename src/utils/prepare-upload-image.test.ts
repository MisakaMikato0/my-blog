import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_FILE_SIZE } from "@/constants/upload";
import {
	FILE_TOO_LARGE,
	getUpyunUploadError,
	prepareUploadImage,
} from "@/utils/prepare-upload-image";

describe("prepareUploadImage", () => {
	it("keeps files under the upload limit unchanged", async () => {
		const file = new File([new Uint8Array(1024)], "shot.png", {
			type: "image/png",
		});
		await expect(prepareUploadImage(file)).resolves.toBe(file);
	});

	it("rejects oversized gifs that cannot be recompressed", async () => {
		const file = new File(
			[new Uint8Array(MAX_UPLOAD_FILE_SIZE + 1)],
			"anim.gif",
			{ type: "image/gif" },
		);
		await expect(prepareUploadImage(file)).rejects.toThrow(FILE_TOO_LARGE);
	});
});

describe("getUpyunUploadError", () => {
	it("maps upyun file too large to FILE_TOO_LARGE", () => {
		const err = getUpyunUploadError(
			403,
			JSON.stringify({
				code: 403,
				message: "file too large",
				url: "/gallery/blueprotocol/1789990934284-gj95.png",
			}),
		);
		expect(err).toBeInstanceOf(Error);
		expect(err?.message).toBe(FILE_TOO_LARGE);
	});

	it("accepts successful form responses", () => {
		expect(getUpyunUploadError(200, JSON.stringify({ code: 200 }))).toBeNull();
		expect(getUpyunUploadError(200, "")).toBeNull();
	});
});
