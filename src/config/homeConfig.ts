import type { HomeConfig } from "../types/config";

export const homeConfig: HomeConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	avatar: "assets/images/avatar.webp",

	// 名字
	name: "幽幽子",

	// 首页展示名字（留空则使用 name）
	displayName: "幽幽子",

	// 职业/身份标签
	occupation: "[搬砖/打螺丝]",

	// 个人签名（支持多条，会循环打字+删除效果）
	bio: ["且视他人之疑目如盏盏鬼火，大胆地去走你的夜路"],

	hero: {
		backgroundImage: "/assets/images/home/hero-home.webp",
		backgroundImageMobile: "/assets/images/home/home-mobile.avif",
		mosaic: {
			rows: 4,
			columns: 6,
			aspectRatio: 827 / 472,
			idleVisible: 6,
			idleInterval: 900,
			seed: 20260814,
			// 首屏六块碎片按 reveal rank 放置；滚动或轮换后的随机布局不受影响。
			initialLayout: [
				{ x: 0.14, y: 0.305, width: 0.104, height: 0.205 },
				{ x: 0.435, y: 0.18, width: 0.068, height: 0.13, blur: 5.5 },
				{ x: 0.642, y: 0.368, width: 0.047, height: 0.092, blur: 5 },
				{ x: 0.863, y: 0.402, width: 0.097, height: 0.19 },
				{ x: 0.337, y: 0.653, width: 0.159, height: 0.313 },
				{ x: 0.639, y: 0.751, width: 0.116, height: 0.228 },
			],
			scrub: 0.45,
			desktopScrollDistance: 3500,
			mobileScrollDistance: 2400,
			desktopMinViewports: 4,
			mobileMinViewports: 3,
			interactionHold: 0.17,
		},
		contact: {
			platform: "B站",
			handle: "御坂17017",
		},
		// 第二层居中落款：随滚动从右上角逐字如雨下落
		signature: {
			text: "当然，是特别的樱花瓣啦。因为播撒这些的话就能让幻想乡当中充满春了。",
		},
		// 玻璃雨珠 + 撞击水花（移动端自动降低密度，尊重 prefers-reduced-motion）
		rain: {
			enabled: true,
			intensity: 0.6,
			// 留空则随主题自动取色（暗色→白 / 浅色→深灰）；也可填 "#7fb0ff" 或 "127,176,255"
			color: "#ffb3c6",
		},
	},

	dataLayer: {
		visitImage: "/assets/images/home/home-data-1.avif",
		archiveImage: "/assets/images/home/home-data-2.avif",
		contactImage: "/assets/images/home/home-data-3.avif",
	},

	// 展示层：垂直线 → 长柱 → 字体显隐 → 柱子扩全屏 → 衔接百叶窗
	displayLayer: {
		enabled: true,
		kicker: "作品展示",
		title: "CRYSTALLIZE GALLERY",
		description:
			"Where fleeting visions crystallize into permanence — each frame a frozen breath of time, each work a memory hardened into light.",
		scrollDistance: 4000,
		pillarFinalWidth: "18vw",
		emitterImage: "https://image.hakugyokurou.fun/file/home/td.webp",
	},

	portfolioShutter: {
		enabled: true,
		kicker: "The End",
		title: "愿你每一天 都闪闪发光",
		description: "岁岁常欢愉，万事皆胜意",
		scrollDistance: 3000,
		finalImage: {
			midgroundImage: "/assets/images/home-truncated/utl-back1.webp",
			backgroundVideo: "/assets/images/home-truncated/utl-back2.webm",
			foregroundImage: "https://image.hakugyokurou.fun/file/home/utl-1.webp",
			alt: "2026年 加油！",
		},
		interlude: {
			foreground:
				"https://image.hakugyokurou.fun/file/home/1784988763410_b-1.webp",
			stripLeft:
				"https://image.hakugyokurou.fun/file/home/1784986445539_b-2.webp",
			stripRight:
				"https://image.hakugyokurou.fun/file/home/1784986447654_b-3.webp",
			copyLeft: "Pretty",
			copyRight: "Derby",
		},
		panels: [
			{
				title: "外部站点",
				english: "PROJECTS",
				description: "幽幽子主站 · 工具导航",
				image: "https://image.hakugyokurou.fun/file/home/home-truncated1.webp",
				alt: "外部站点",
			},
			{
				title: "术业专攻",
				english: "SPECIALITIES",
				description: "AI学习 · 技术架构 · 踩坑记录",
				image: "https://image.hakugyokurou.fun/file/home/home-truncated2.webp",
				alt: "术业专攻",
			},
			{
				title: "博客特色",
				english: "BLOG FEATURES",
				description: "RAG 知识检索 · 归档热力图 · 结构化知识库",
				image: "https://image.hakugyokurou.fun/file/home/home-truncated3.webp",
				alt: "博客特色",
			},
			{
				title: "站点技术",
				english: "STACK",
				description: "Astro · SSG静态生成 · 纯AI零手工",
				image: "https://image.hakugyokurou.fun/file/home/home-truncated4.webp",
				alt: "站点技术",
			},
			{
				title: "相册收录",
				english: "PHOTO ALBUM",
				description: "AI 生图 · API 接入",
				image: "https://image.hakugyokurou.fun/file/home/home-truncated5.webp",
				alt: "相册收录",
			},
		],
	},

	// 首页技能图标
	skills: [
		{ name: "Astro", icon: "simple-icons:astro", group: "Frontend" },
		{ name: "Svelte", icon: "simple-icons:svelte", group: "Frontend" },
		{ name: "TypeScript", icon: "simple-icons:typescript", group: "Language" },
		{ name: "React", icon: "simple-icons:react", group: "Frontend" },
		{ name: "Tailwind", icon: "simple-icons:tailwindcss", group: "Style" },
		{ name: "Java", icon: "mdi:language-java", group: "Backend" },
		{ name: "Python", icon: "simple-icons:python", group: "Language" },
		{ name: "Spring", icon: "simple-icons:spring", group: "Backend" },
		{ name: "Redis", icon: "simple-icons:redis", group: "Storage" },
		{ name: "MySQL", icon: "simple-icons:mysql", group: "Storage" },
		{ name: "MongoDB", icon: "simple-icons:mongodb", group: "Storage" },
		{ name: "RabbitMQ", icon: "simple-icons:rabbitmq", group: "Backend" },
		{ name: "Docker", icon: "simple-icons:docker", group: "DevOps" },
		{ name: "Linux", icon: "simple-icons:linux", group: "DevOps" },
		{ name: "Nginx", icon: "simple-icons:nginx", group: "DevOps" },
	],

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "qq",
			icon: "fa7-brands:qq",
			url: "https://qm.qq.com/q/2R07cjGTZ0",
			showName: false,
		},
		{
			name: "B站",
			icon: "fa7-brands:bilibili",
			url: "https://space.bilibili.com/38595557",
			showName: false,
		},
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/MisakaMikato0/",
			showName: false,
		},
		{
			name: "站内留言",
			icon: "material-symbols:chat-rounded",
			url: "/guestbook/",
			showName: false,
		},
		{
			name: "RSS",
			icon: "fa7-solid:rss",
			url: "/rss/",
			showName: false,
		},
	],
};
