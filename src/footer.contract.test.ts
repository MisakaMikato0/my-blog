import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const footerSource = fs.readFileSync(
	path.resolve(process.cwd(), "src/components/layout/Footer.astro"),
	"utf8",
);
const variablesSource = fs.readFileSync(
	path.resolve(process.cwd(), "src/styles/variables.styl"),
	"utf8",
);

describe("页脚视觉与功能契约", () => {
	it("使用全宽语义 footer 和预览版的主区域", () => {
		expect(footerSource).toContain('<footer class="site-footer"');
		expect(footerSource).toContain("site-footer__brand");
		expect(footerSource).toContain("site-footer__contact");
		expect(footerSource).toContain("幻想乡结界稳定 / 2026");
	});

	it("保留主题切换可继承的颜色变量和所有交互入口", () => {
		expect(footerSource).toContain("site-footer__social-link");
		expect(footerSource).toContain("window.openPrivacyModal");
		expect(footerSource).toContain("window.openUserAgreementModal");
		expect(footerSource).toContain('id="footer-running-days"');
		expect(footerSource).toContain('id="footer-last-update"');
	});

	it("让页面空白背景与 footer 的两套主题底色一致", () => {
		expect(variablesSource).toContain("--page-bg: #fff7fb");
		expect(variablesSource).toContain("--page-bg: #111827");
	});
});
