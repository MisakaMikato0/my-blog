import { getAllPostMeta } from "@/utils/post-meta";

// 文章元数据装配逻辑见 src/utils/post-meta.ts，页面与 endpoint 共用，构建零网络依赖

export async function GET(): Promise<Response> {
	const entries = await getAllPostMeta();
	return new Response(JSON.stringify(entries));
}
