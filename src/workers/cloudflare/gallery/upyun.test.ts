import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_FILE_SIZE } from "@/constants/upload";
import { createUploadToken } from "./upyun";

const env = {
	UPYUN_BUCKET: "bucket",
	UPYUN_OPERATOR: "op",
	UPYUN_OPERATOR_PASSWORD: "pass",
	UPYUN_FORM_API_SECRET: "secret",
	UPYUN_CDN_HOST: "img.example.com",
};

describe("createUploadToken", () => {
	it("signs a policy that allows files up to the shared upload limit", () => {
		const token = createUploadToken(env, "blueprotocol", "png");
		const policy = JSON.parse(
			Buffer.from(token.policy, "base64").toString("utf8"),
		) as Record<string, string>;
		expect(policy["content-length-range"]).toBe(`0,${MAX_UPLOAD_FILE_SIZE}`);
		expect(MAX_UPLOAD_FILE_SIZE).toBe(20 * 1024 * 1024);
	});
});
