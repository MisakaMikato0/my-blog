import { LinkPresets } from "../constants/link-presets";
import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
} from "../types/config";
import { siteConfig } from "./siteConfig";

/**
 * 构建导航栏链接配置
 * 遵循企业级代码规范：
 * - 使用 LinkPreset 枚举消除魔法值
 * - 通过 LinkPresets 集中管理链接元数据（i18n、图标、URL）
 * - 页面开关控制可选链接的显隐
 * - 先依次构建各导航项，再统一组装到 links 数组
 */
const buildNavBarConfig = (): NavBarConfig => {
	// 1. 构建文章下拉菜单
	const postsNav: NavBarLink = {
		...LinkPresets[LinkPreset.NavPosts],
		children: [
			LinkPreset.Archive,
			LinkPreset.Categories,
			LinkPreset.PostList,
			LinkPreset.WritePost,
		],
	};

	// 2. 构建联系我下拉菜单
	const contactChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.friends) {
		contactChildren.push(LinkPreset.Friends);
	}
	if (siteConfig.pages.guestbook) {
		contactChildren.push(LinkPreset.Guestbook);
	}
	contactChildren.push(LinkPreset.QQGroup);

	const contactNav: NavBarLink | null =
		contactChildren.length > 0
			? {
					...LinkPresets[LinkPreset.ContactMe],
					children: contactChildren,
				}
			: null;

	// 3. 构建爱好下拉菜单
	const hobbyChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.bangumi) {
		hobbyChildren.push(LinkPreset.Bangumi);
	}
	hobbyChildren.push(LinkPreset.Music);
	if (siteConfig.pages.books) {
		hobbyChildren.push(LinkPreset.Books);
	}

	const hobbyNav: NavBarLink = {
		...LinkPresets[LinkPreset.Hobby],
		children: hobbyChildren,
	};

	// 4. 构建我的下拉菜单
	const myChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.calendar) {
		myChildren.push(LinkPreset.Calendar);
	}
	if (siteConfig.pages.gallery) {
		myChildren.push(LinkPreset.Gallery);
	}
	if (siteConfig.pages.dynamic) {
		myChildren.push(LinkPreset.Dynamic);
	}
	if (siteConfig.pages.sponsor) {
		myChildren.push(LinkPreset.Sponsor);
	}
	myChildren.push(LinkPreset.About);

	const myNav: NavBarLink = {
		...LinkPresets[LinkPreset.NavMy],
		children: myChildren,
	};

	// 5. 统一组装导航栏链接（顺序：主页 → Touhou → 工具导航 → 文章 → 爱好 → 联系我 → 我的）
	const links: (NavBarLink | LinkPreset)[] = [
		LinkPreset.Home,
		LinkPreset.Feibichi,
		...(siteConfig.pages.collections ? [LinkPreset.Collections] : []),
		postsNav,
		hobbyNav,
		...(contactNav ? [contactNav] : []),
		myNav,
	];

	return { links };
};

export const navBarConfig: NavBarConfig = buildNavBarConfig();
