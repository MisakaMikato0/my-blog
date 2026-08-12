import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ArchiveStats from "./ArchiveStats.svelte";

describe("ArchiveStats", () => {
	it("不会在任何 archive-stats__value 中渲染 NaN", () => {
		render(ArchiveStats, {
			totalPosts: 20,
			currentYearPosts: 5,
			annualPostGoal: 50,
			totalPostsLabel: "全部文章",
			progressLabel: "年进度",
			githubLabel: "本年 GitHub 贡献",
		});

		expect(screen.queryByText("NaN")).toBeNull();
	});

	it("渲染四个统计卡片且不出现多余的写作跨度卡片", () => {
		render(ArchiveStats, {
			totalPosts: 20,
			currentYearPosts: 5,
			annualPostGoal: 50,
			totalPostsLabel: "全部文章",
			progressLabel: "年进度",
			goalLabel: "年度目标",
			githubLabel: "本年 GitHub 贡献",
			unavailableLabel: "--",
		});

		const values = document.querySelectorAll(".archive-stats__value");
		expect(values).toHaveLength(4);
		expect(values[0].textContent).toBe("20");

		const labels = [...document.querySelectorAll(".archive-stats__label")].map(
			(el) => el.textContent,
		);
		expect(labels).toEqual(["全部文章", "", "年进度", "本年 GitHub 贡献"]);
	});
});
