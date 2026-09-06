import { homeConfig, siteConfig } from "@/config";

/** Resolve the canonical site root used by every JSON-LD entity ID. */
function resolveSiteRoot(site: URL | string | undefined): string {
	return new URL("/", site ?? siteConfig.site_url).href;
}

function resolveAboutUrl(site: URL | string | undefined): string {
	return new URL("/about/", site ?? siteConfig.site_url).href;
}

function resolveDefaultImageUrl(site: URL | string | undefined): string {
	return new URL(
		siteConfig.defaultOgImage || "/assets/images/aut.webp",
		site ?? siteConfig.site_url,
	).href;
}

function resolveSameAs(): string[] {
	return homeConfig.links
		.filter((link) => /^https?:\/\//i.test(link.url))
		.map((link) => link.url);
}

export function buildWebSiteEntity(
	site: URL | string | undefined,
): Record<string, unknown> {
	const siteRoot = resolveSiteRoot(site);
	return {
		"@type": "WebSite",
		"@id": `${siteRoot}#website`,
		url: siteRoot,
		name: siteConfig.title,
		description: siteConfig.description,
		inLanguage: siteConfig.lang.replace("_", "-"),
		publisher: { "@id": `${siteRoot}#organization` },
	};
}

export function buildPersonEntity(
	site: URL | string | undefined,
): Record<string, unknown> {
	const siteRoot = resolveSiteRoot(site);
	return {
		"@type": ["Person", "Author"],
		"@id": `${siteRoot}#person`,
		name: homeConfig.name,
		url: resolveAboutUrl(site),
		description: siteConfig.description,
		image: resolveDefaultImageUrl(site),
		jobTitle: homeConfig.occupation,
		knowsAbout: siteConfig.keywords,
		sameAs: resolveSameAs(),
	};
}

export function buildOrganizationEntity(
	site: URL | string | undefined,
): Record<string, unknown> {
	const siteRoot = resolveSiteRoot(site);
	const imageUrl = resolveDefaultImageUrl(site);
	return {
		"@type": "Organization",
		"@id": `${siteRoot}#organization`,
		name: siteConfig.title,
		url: siteRoot,
		logo: {
			"@type": "ImageObject",
			"@id": `${siteRoot}#logo`,
			url: imageUrl,
		},
		sameAs: resolveSameAs(),
	};
}

/** Escape less-than signs before embedding JSON-LD inside an inline script. */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replaceAll("<", "\\u003c");
}
