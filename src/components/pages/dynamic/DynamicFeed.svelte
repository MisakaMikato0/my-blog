<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import dayjs from "dayjs";
import Icon from "@/components/common/Icon.svelte";
import { dynamicConfig, siteConfig } from "@/config";
import { url } from "@/utils/url-utils";

interface FeedImage {
	alt: string;
	src: string;
}

interface FeedItem {
	id: string;
	published: number;
	html: string;
	images: FeedImage[];
	pinned: boolean;
	location: string;
}

let items = $state<FeedItem[]>([]);
let loading = $state(true);
let error = $state(false);
let year = $state("all");
let visibleCount = $state(dynamicConfig.itemsPerPage);

const years = $derived(
	[...new Set(items.map((i) => dayjs(i.published).year()))].sort(
		(a, b) => b - a,
	),
);

const filtered = $derived(
	year === "all"
		? items
		: items.filter((i) => dayjs(i.published).year() === Number(year)),
);

const visibleItems = $derived(filtered.slice(0, visibleCount));

const hasMore = $derived(visibleCount < filtered.length);

function formatTime(timestamp: number): string {
	return dayjs(timestamp).format("YYYY-MM-DD HH:mm");
}

async function load() {
	loading = true;
	error = false;
	try {
		const res = await fetch(dynamicConfig.apiUrl);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as FeedItem[];
		items = Array.isArray(data) ? data : [];
		visibleCount = dynamicConfig.itemsPerPage;
	} catch {
		error = true;
	} finally {
		loading = false;
	}
}

function loadMore() {
	visibleCount += dynamicConfig.itemsPerPage;
}

$effect(() => {
	void load();
});
</script>

<div class="dynamic-page">
	<div class="dynamic-page__toolbar">
		<select class="dynamic-year-select" bind:value={year} aria-label={i18n(I18nKey.dynamicAllYears)}>
			<option value="all">{i18n(I18nKey.dynamicAllYears)}</option>
			{#each years as y (y)}
				<option value={y}>{y}</option>
			{/each}
		</select>
	</div>

	{#if loading}
		<div class="dynamic-loading card-base" role="status">
			<Icon name="svg-spinners:ring-resize" size="sm" />
			<span>{i18n(I18nKey.dynamicLoading)}</span>
		</div>
	{:else if error}
		<div class="dynamic-empty card-base">
			<Icon name="material-symbols:error-rounded" size="lg" />
			<p>{i18n(I18nKey.dynamicLoadError)}</p>
			<button class="dynamic-btn" onclick={load}>{i18n(I18nKey.dynamicAdminRefresh)}</button>
		</div>
	{:else if visibleItems.length === 0}
		<div class="dynamic-empty card-base">
			<Icon name="material-symbols:dynamic-feed-rounded" size="lg" />
			<p>{i18n(I18nKey.dynamicEmpty)}</p>
		</div>
	{:else}
		<div class="dynamic-feed">
			{#each visibleItems as item (item.id)}
				<article class="dynamic-entry card-base">
					<header class="dynamic-entry__header">
						<a href={url(dynamicConfig.profileUrl)} class="dynamic-avatar" aria-label={siteConfig.navbar.title}>
							<Icon name="material-symbols:person-rounded" />
						</a>
						<div class="dynamic-entry__meta">
							<a href={url(dynamicConfig.profileUrl)} class="dynamic-entry__name">
								{siteConfig.navbar.title}
							</a>
							<time class="dynamic-entry__time" datetime={new Date(item.published).toISOString()}>
								{formatTime(item.published)}
							</time>
						</div>
						{#if item.pinned}
							<span class="dynamic-entry__pin">
								<Icon name="material-symbols:pinboard" size="xs" />
								{i18n(I18nKey.dynamicPinned)}
							</span>
						{/if}
					</header>

					<div class="dynamic-entry__body dynamic-md">{@html item.html}</div>

					{#if item.images.length > 0}
						<div class="dynamic-gallery" data-count={Math.min(item.images.length, 6)}>
							{#each item.images.slice(0, 6) as img, idx (img.src)}
								<a
									href={img.src}
									data-fancybox={`dynamic-${item.id}`}
									data-caption={img.alt}
									class="dynamic-gallery__item"
								>
									<img
										src={img.src}
										alt={img.alt || `image ${idx + 1}`}
										loading="lazy"
										decoding="async"
									/>
									{#if item.images.length > 6 && idx === 5}
										<span class="dynamic-gallery__more">+{item.images.length - 6}</span>
									{/if}
								</a>
							{/each}
						</div>
					{/if}

					{#if item.location}
						<footer class="dynamic-entry__footer">
							<Icon name="material-symbols:location-on-rounded" size="xs" />
							<span>{item.location}</span>
						</footer>
					{/if}
				</article>
			{/each}
		</div>

		{#if hasMore}
			<div class="dynamic-page__more">
				<button class="dynamic-btn" onclick={loadMore}>
					{i18n(I18nKey.dynamicLoadMore)}
				</button>
			</div>
		{:else if items.length > 0}
			<div class="dynamic-page__end">
				<span>{i18n(I18nKey.dynamicNoMore)}</span>
			</div>
		{/if}
	{/if}
</div>
