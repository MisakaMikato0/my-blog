import { getSortedPosts } from "@/utils/content-utils";

// 文章元数据装配（构建时使用）
// 页面与 /api/allPostMeta.json 共用此函数，保证构建时无需请求线上站点

export type AllPostMetaItem = {
	id: string;
	title: string;
	description: string;
	published: number;
	category: string;
	password: boolean;
};

export async function getAllPostMeta(): Promise<AllPostMetaItem[]> {
	const posts = await getSortedPosts();

	return (
		posts
			.map((post) => ({
				id: post.id,
				title: post.data.title,
				description: post.data.description,
				published: post.data.published.getTime(),
				category: post.data.category || "",
				password: !!post.data.password,
			}))
			// 日历按纯日期排序，忽略置顶
			.sort((a, b) => b.published - a.published)
	);
}
