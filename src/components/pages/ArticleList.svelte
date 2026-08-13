<script lang="ts">
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import AnimatedTabs from "@/components/controls/AnimatedTabs.svelte";
import {
	createEmptyUmamiPageviewLookup,
	getUmamiPageviewLookup,
	normalizeUmamiPageviewPath,
} from "@/utils/umami-pageviews";

type ArticleSort = "latest" | "earliest";

type ArticleListTag = {
	name: string;
	url: string;
};

export type ArticleListPost = {
	id: string;
	title: string;
	url: string;
	publishedIso: string;
	publishedTimestamp: number;
	publishedText: string;
	category: string;
	categoryUrl: string;
	tags: ArticleListTag[];
	description: string;
	pinned: boolean;
	password: boolean;
	coverImage: string;
	coverApiUrls: string[];
	coverReferrerPolicy: string;
};

type UmamiPageviewConfig = {
	apiBase: string;
	enabled: boolean;
	shareId: string;
};

interface Props {
	posts: ArticleListPost[];
	postsPerPage?: number;
	umamiPageviews?: UmamiPageviewConfig;
	fallbackCoverImage?: string;
}

let {
	posts,
	postsPerPage = 15,
	umamiPageviews,
	fallbackCoverImage = "",
}: Props = $props();

let containerRef = $state<HTMLElement | null>(null);
let sortMode = $state<ArticleSort>("latest");
let currentPage = $state(1);
let layoutMode = $state<"list" | "grid">("list");
let pageviewLookup = $state<Map<string, number> | null>(null);
let loadedImageIds = $state<Set<string>>(new Set());

function initLayoutMode() {
	try {
		const saved = localStorage.getItem("postListLayout");
		if (saved === "list" || saved === "grid") layoutMode = saved;
	} catch {}
}

function handleLayoutChange(e: Event) {
	layoutMode = (e as CustomEvent).detail.layout;
}

const pinnedPosts = $derived(
	posts
		.filter((post) => post.pinned)
		.sort((a, b) => b.publishedTimestamp - a.publishedTimestamp),
);
const regularPosts = $derived(
	posts
		.filter((post) => !post.pinned)
		.sort((a, b) => {
			const difference = b.publishedTimestamp - a.publishedTimestamp;
			return sortMode === "latest" ? difference : -difference;
		}),
);
const totalPages = $derived(
	Math.max(1, Math.ceil(regularPosts.length / postsPerPage)),
);
const paginatedPosts = $derived(
	regularPosts.slice(
		(currentPage - 1) * postsPerPage,
		currentPage * postsPerPage,
	),
);

function getCategoryHue(category: string): number {
	let hash = 2166136261;
	for (let index = 0; index < category.length; index++) {
		hash ^= category.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 360;
}

function getPageviews(post: ArticleListPost): string {
	if (!umamiPageviews?.enabled || pageviewLookup === null) return "—";
	return (
		pageviewLookup.get(normalizeUmamiPageviewPath(post.url)) || 0
	).toLocaleString();
}

function scrollToListTop() {
	if (!containerRef) return;
	window.scrollTo(
		0,
		Math.max(0, window.scrollY + containerRef.getBoundingClientRect().top),
	);
}

function changeSort(nextSort: ArticleSort) {
	if (nextSort === sortMode) return;
	sortMode = nextSort;
	currentPage = 1;
	requestAnimationFrame(scrollToListTop);
}

function goToPage(page: number) {
	const nextPage = Math.max(1, Math.min(totalPages, page));
	if (nextPage === currentPage) return;
	currentPage = nextPage;
	requestAnimationFrame(scrollToListTop);
}

function generatePageNumbers(
	current: number,
	total: number,
): (number | string)[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, index) => index + 1);
	}

	const rangeWithDots: (number | string)[] = [1];
	const left = Math.max(2, current - 2);
	const right = Math.min(total - 1, current + 2);

	if (left > 2) rangeWithDots.push("...");
	for (let page = left; page <= right; page++) rangeWithDots.push(page);
	if (right < total - 1) rangeWithDots.push("...");
	rangeWithDots.push(total);

	return rangeWithDots;
}

const pageNumbers = $derived(generatePageNumbers(currentPage, totalPages));

function handleImageLoad(e: Event, postId: string) {
	const img = e.target as HTMLImageElement;
	if (!img.classList.contains("is-loaded")) {
		img.classList.add("is-loaded");
	}
	if (postId && !loadedImageIds.has(postId)) {
		loadedImageIds = new Set(loadedImageIds).add(postId);
	}
}

function handleImageError(e: Event, apiUrls: string[], fallback = "") {
	const img = e.target as HTMLImageElement;
	const currentIndex = Number.parseInt(img.dataset.apiIndex || "0", 10);
	const nextIndex = currentIndex + 1;

	if (nextIndex < apiUrls.length) {
		img.dataset.apiIndex = String(nextIndex);
		img.src = apiUrls[nextIndex];
	} else if (fallback && !img.dataset.usedFallback) {
		img.dataset.usedFallback = "1";
		img.src = fallback;
	} else {
		const media = img.closest(".article-list-card__media");
		media?.classList.add("is-hidden");
		media?.closest(".article-list-card")?.classList.remove("has-image");
	}
}

const cardRects = new WeakMap<HTMLElement, DOMRect>();

function handleCardMouseEnter(e: MouseEvent) {
	const link = e.currentTarget as HTMLElement;
	cardRects.set(link, link.getBoundingClientRect());
}

function handleCardMouseMove(e: MouseEvent) {
	const link = e.currentTarget as HTMLElement;
	let rect = cardRects.get(link);
	if (!rect) {
		rect = link.getBoundingClientRect();
		cardRects.set(link, rect);
	}
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	const zone =
		x < rect.width / 2
			? y < rect.height / 2
				? "tl"
				: "bl"
			: y < rect.height / 2
				? "tr"
				: "br";
	if (link.dataset.hoverZone !== zone) link.dataset.hoverZone = zone;
}

function handleCardMouseLeave(e: MouseEvent) {
	const link = e.currentTarget as HTMLElement;
	cardRects.delete(link);
	link.removeAttribute("data-hover-zone");
}

onMount(() => {
	initLayoutMode();
	window.addEventListener("layoutChange", handleLayoutChange);
	if (
		umamiPageviews?.enabled &&
		umamiPageviews.apiBase &&
		umamiPageviews.shareId
	) {
		void getUmamiPageviewLookup(umamiPageviews)
			.then((lookup) => {
				pageviewLookup = lookup;
			})
			.catch(() => {
				pageviewLookup = createEmptyUmamiPageviewLookup();
			});
	}

	return () => {
		window.removeEventListener("layoutChange", handleLayoutChange);
	};
});
</script>

{#snippet articleMeta(post: ArticleListPost)}
	<div class="article-list-card__meta">
		{#if layoutMode === "grid"}
			<span class="article-list-card__category">#{post.category}</span>
			<span class="article-list-card__divider" aria-hidden="true">/</span>
			<span class="article-list-card__meta-item">
				<Icon icon="material-symbols:calendar-month-rounded" size="sm" />
				<time datetime={post.publishedIso}>{post.publishedText}</time>
			</span>
		{:else}
			<a
				href={post.categoryUrl}
				class="article-list-card__category article-list-card__meta-link"
				style={`--article-category-hue: ${getCategoryHue(post.category)}`}
				aria-label={`查看分类归档：${post.category}`}
			>
				{post.category}
			</a>
			<span class="article-list-card__meta-divider" aria-hidden="true">/</span>
			<span class="article-list-card__meta-item">
				<Icon icon="material-symbols:calendar-month-rounded" size="sm" />
				<span class="sr-only">发布日期：</span>
				<time datetime={post.publishedIso}>{post.publishedText}</time>
			</span>
			<span class="article-list-card__meta-divider" aria-hidden="true">/</span>
			<span class="article-list-card__meta-item" title="访问量">
				<Icon icon="material-symbols:visibility-outline-rounded" size="sm" />
				<span class="sr-only">访问量：</span>
				<span>{getPageviews(post)}</span>
			</span>
			{#each post.tags.slice(0, 3) as tag (tag.name)}
				<span class="article-list-card__meta-divider" aria-hidden="true">/</span>
				<a
					href={tag.url}
					class="article-list-card__tag article-list-card__meta-link"
					aria-label={`查看标签归档：${tag.name}`}
				>
					{tag.name}
				</a>
			{/each}
			{#if post.tags.length > 3}
				<span class="article-list-card__meta-divider" aria-hidden="true">/</span>
				<span class="article-list-card__tag-more">
					<span class="sr-only">另有</span>+{post.tags.length - 3}
				</span>
			{/if}
		{/if}
	</div>
{/snippet}

<div class="article-list" bind:this={containerRef}>
	{#if currentPage === 1 && pinnedPosts.length > 0}
		<section class="article-list-pinned" aria-labelledby="article-list-pinned-title">
			<h2 id="article-list-pinned-title" class="sr-only">置顶文章</h2>
			<div class="article-list-pinned__collection">
				{#each pinnedPosts as post (post.id)}
					<article class="article-list-card article-list-card--pinned" class:has-image={!!post.coverImage}>
						<a href={post.url} class="article-list-card__link" aria-label={`查看文章：${post.title}`} onmousemove={handleCardMouseMove} onmouseenter={handleCardMouseEnter} onmouseleave={handleCardMouseLeave}>
							{#if post.coverImage}
								<div class="article-list-card__media" class:skeleton-shimmer={layoutMode === "grid" && !loadedImageIds.has(post.id)} aria-hidden="true">
									<picture>
										<img
											class="article-list-card__image"
											src={post.coverImage}
											alt=""
											width="640"
											height="360"
											loading="lazy"
											decoding="async"
											data-api-index="0"
											data-post-id={post.id}
											referrerpolicy={post.coverReferrerPolicy || undefined}
											onload={(e) => handleImageLoad(e, post.id)}
											onerror={(e) => handleImageError(e, post.coverApiUrls, fallbackCoverImage)}
										/>
									</picture>
									<div class="article-list-card__media-overlay"></div>
								</div>
							{/if}
							<div class="article-list-card__content">
								{#if post.pinned}
									<div class="article-list-card__pinned">
										<Icon icon="material-symbols:pinboard" size="sm" />
										<span>置顶</span>
									</div>
								{/if}
								<h2 class="article-list-card__title">
									{post.title}
									{#if post.password}
										<span class="article-list-card__lock" aria-hidden="true">
											<Icon icon="material-symbols:lock-outline" size="sm" />
										</span>
										<span class="sr-only">加密文章</span>
									{/if}
								</h2>
								<p class="article-list-card__description">{post.description}</p>
								{#if post.pinned}
									<div class="article-list-card__rule" aria-hidden="true"></div>
								{/if}
								{@render articleMeta(post)}
							</div>
						</a>
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<header class="article-list-toolbar">
		<div class="article-list-toolbar__total" aria-label={`共 ${posts.length} 篇文章`}>
			<span>共</span>
			<strong>{posts.length}</strong>
			<span>篇</span>
		</div>
		<div class="article-list-toolbar__sort" aria-label="文章排序">
			<button
				type="button"
				class:is-active={sortMode === "latest"}
				aria-pressed={sortMode === "latest"}
				onclick={() => changeSort("latest")}
			>
				最新
			</button>
			<button
				type="button"
				class:is-active={sortMode === "earliest"}
				aria-pressed={sortMode === "earliest"}
				onclick={() => changeSort("earliest")}
			>
				最早
			</button>
		</div>
		<AnimatedTabs bind:activeTab={layoutMode} />
	</header>

	<p class="sr-only" aria-live="polite">
		当前按{sortMode === "latest" ? "最新" : "最早"}排序，第 {currentPage} 页，共 {totalPages} 页
	</p>

	<section class="article-list-regular" aria-labelledby="article-list-regular-title">
		<h2 id="article-list-regular-title" class="sr-only">普通文章</h2>
		{#if paginatedPosts.length > 0}
			<div class="article-list-regular__collection" data-view={layoutMode}>
				{#each paginatedPosts as post, index (post.id)}
					<article
						class="article-list-card article-list-card--regular"
						class:has-image={!!post.coverImage}
						class:is-pinned={post.pinned}
						data-post-id={post.id}
					>
						<a
							href={post.url}
							class="article-list-card__link"
						aria-label={`查看文章：${post.title}`}
						onmousemove={handleCardMouseMove} onmouseenter={handleCardMouseEnter} onmouseleave={handleCardMouseLeave}>
							{#if post.coverImage}
								<div
									class="article-list-card__media"
									class:skeleton-shimmer={layoutMode === "grid" && !loadedImageIds.has(post.id)}
									aria-hidden="true"
								>
									<picture>
										<img
											class="article-list-card__image"
											src={post.coverImage}
											alt=""
											width="640"
											height="360"
											loading={index < 3 ? "eager" : "lazy"}
											fetchpriority={index === 0 ? "high" : "auto"}
											decoding="async"
											data-api-index="0"
											data-post-id={post.id}
											referrerpolicy={post.coverReferrerPolicy || undefined}
											onload={(e) => handleImageLoad(e, post.id)}
											onerror={(e) => handleImageError(e, post.coverApiUrls, fallbackCoverImage)}
										/>
									</picture>
									<div class="article-list-card__media-overlay"></div>
								</div>
							{/if}
							<div class="article-list-card__content">
								{#if post.pinned}
									<div class="article-list-card__pinned">
										<Icon icon="material-symbols:pinboard" size="sm" />
										<span>置顶</span>
									</div>
								{/if}
								<h2 class="article-list-card__title">
									{post.title}
									{#if post.password}
										<span class="article-list-card__lock" aria-hidden="true">
											<Icon icon="material-symbols:lock-outline" size="sm" />
										</span>
										<span class="sr-only">加密文章</span>
									{/if}
								</h2>
								<p class="article-list-card__description">{post.description}</p>
								{@render articleMeta(post)}
							</div>
						</a>
					</article>
				{/each}
			</div>
		{:else}
			<div class="article-list-empty">
				<span class="article-list-empty__title">暂无普通文章</span>
				<span class="article-list-empty__meta">新的内容会显示在这里。</span>
			</div>
		{/if}
	</section>

	{#if totalPages > 1}
		<nav class="article-list-pagination" aria-label="文章分页">
			<div class="article-list-pagination__inner">
				<button
					type="button"
					class="article-list-pagination__btn"
					disabled={currentPage === 1}
					aria-label="上一页"
					onclick={() => goToPage(currentPage - 1)}
				>
					<Icon icon="material-symbols:chevron-left-rounded" class="text-[1.75rem]" />
				</button>

				<div class="article-list-pagination__pages">
					{#each pageNumbers as pageItem, pageIndex (`${pageItem}-${pageIndex}`)}
						{#if pageItem === "..."}
							<span class="article-list-pagination__dots" aria-hidden="true">
								<Icon icon="material-symbols:more-horiz" />
							</span>
						{:else}
							<button
								type="button"
								class="article-list-pagination__page"
								class:is-active={pageItem === currentPage}
								aria-label={`第 ${pageItem} 页`}
								aria-current={pageItem === currentPage ? "page" : undefined}
								onclick={() => goToPage(pageItem as number)}
							>
								{pageItem}
							</button>
						{/if}
					{/each}
				</div>

				<button
					type="button"
					class="article-list-pagination__btn"
					disabled={currentPage === totalPages}
					aria-label="下一页"
					onclick={() => goToPage(currentPage + 1)}
				>
					<Icon icon="material-symbols:chevron-right-rounded" class="text-[1.75rem]" />
				</button>
			</div>
		</nav>
	{/if}
</div>
