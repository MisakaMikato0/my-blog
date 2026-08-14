# shijiucode.cn 相册页技术分析清单

> 分析对象：https://shijiucode.cn/albums （相册首页）+ /albums/all + /albums/[id]
> 分析方式：抓取 HTML / JS chunk / 调用公开 API / 探测响应头
> 抓取时间：2026-08-14

## 一、技术栈总览

| 层级 | 技术 | 证据 |
|---|---|---|
| 前端框架 | Next.js 16.2.6（App Router） | JS chunk 中 `window.next={version:"16.2.6",appDir:!0}`；RSC 相关 Vary 头 |
| 构建工具 | Turbopack（生产构建） | chunk 名 `turbopack-0.rouiguaugox.js` |
| UI 样式 | Tailwind CSS + shadcn 风格主题 token | CSS 中 `--tw-*` 变量；class 如 `bg-background`、`text-muted-foreground` |
| 暗色模式 | next-themes | 内联主题脚本（class 策略 light/dark/system，localStorage key=theme） |
| 动画 | framer-motion | `motion.div`、`AnimatePresence`、`whileInView`、`staggerChildren` |
| 图标 | lucide-react | 动态 `lucide-${name}` 图标组件 |
| 工具函数 | clsx | class 拼接 |
| 字体 | next/font：Noto Sans SC + Noto Serif SC | html class 中的 `noto_sans_sc_*__variable` |
| 后端 | Spring Boot 系（若依 RuoYi 风格 API） | 统一响应 `{code,msg,data,ok}`、"操作成功"/"请先登录" 文案；存在 /actuator、/druid 路由 |
| 鉴权 | Sa-Token 风格 token | localStorage 存 `shijiu-blog-token`，请求头同名 |
| 图片存储 | 腾讯云 COS | 图片响应头 `Server: tencent-cos`、`x-cos-hash-crc64ecma`、`x-cos-request-id` |
| 图片分发 | 自建域名 img.shijiucode.cn + CDN/WAF（SLT/X-NWS） | 直连无 Referer 403，带 Referer 200（防盗链） |
| 反向代理 | nginx | `Server: nginx` + `X-Powered-By: Next.js` |

## 二、相册功能实现方式（前端）

### 1. 页面结构
- `/albums`：滚轮选择器 + 封面大图背景，选择分类后点「查看」进列表
- `/albums/all`：全部照片（不传 albumId）
- `/albums/[id]`：单相册照片
- 照片网格**完全客户端渲染**：SSR HTML 里 0 张 `<img>`，页面加载后 fetch API 渲染

### 2. 关键组件（均为自研，非现成库）
- **滚轮选择器**（Option Wheel）：自研组件，CSS 变量 `--ow-*` 控制 3D 透视、激活项颜色混合（`color-mix`）、触摸/拖拽滚动
- **无限滚动**：自研 InfiniteScroll 组件，photo/page 每页 48 张
- **瀑布流/自适应列布局**：
  - ResizeObserver 监听容器宽度，动态算列数
  - 图片加载完成后读 `naturalWidth/naturalHeight`，按比例把照片分配到各列（自定义 masonry 算法，非库）
- **加载占位**：用 `crossOrigin="anonymous"` 把压缩图画到 40×40 canvas，取平均主色做占位底色
- **灯箱**：framer-motion `AnimatePresence` + `createPortal`；键盘 ←/→/Esc 切换；预加载相邻两张原图
- **防盗措施**：网格加了 `prevent-copy` class + 禁用右键菜单

### 3. 图片加载策略
- 优先加载 `coverImg.compressPath`（服务端压缩版 `*_compress.jpg`）
- 灯箱大图用 `filePath`（原图）
- 原图未做尺寸裁剪参数（COS 上直接存原图+压缩图两版），单张原图可达 17MB

## 三、API 接口（全部公开可调，无需登录）

- 基址：`https://shijiucode.cn/shijiu-blog/api`
- 统一返回：`{code, msg, data, ok}`

| 接口 | 参数 | 说明 |
|---|---|---|
| GET `/client/blog/album/list` | 无 | 相册列表：`{id, name, description, coverImg{filePath,compressPath}, thumbnails[]}` |
| GET `/client/blog/photo/page` | `pageNum`、`pageSize`(默认24)、`albumId`(不传=全部) | 分页照片：`{total, pages, records[{id, albumId, title, description, coverImg, sort, createTime}]}` |
| GET `/client/blog/home` | 无 | 站点信息、轮播、置顶/最新文章 |
| GET `/client/blog/article/pageByTag` | `tagName`、`pageNum`、`pageSize` | 文章列表 |
| GET `/client/blog/tag/list`、`/category/list` | 无 | 标签/分类 |
| GET `/client/blog/moment/list`、`/moment/tag/list` | `tagName`… | 动态（朋友圈） |
| GET `/shijiu-blog/api/rss.xml` | 无 | RSS |

鉴权机制：白名单外的路径被全局拦截器挡掉，返回 `{code:403, msg:"请先登录"}`（actuator/druid 等路径同样被挡，未真正暴露）。

## 四、图片存储与命名规范

- 域名：`img.shijiucode.cn`（腾讯云 COS，有 Referer 防盗链）
- 路径：`/shijiu-blog/formal/YYYY-MM-DD/<uuid>.(jpg|jpeg)`
- 同目录生成 `_compress.jpg` 压缩版（缩略图/列表用）
- COS 自带 ETag / x-cos-hash-crc64ecma，支持 Range

## 五、部署与运维特征

- nginx 反代 Next.js 应用（自建服务器/国内云，非 Vercel）
- 页面动态渲染：`Cache-Control: no-cache, no-store, must-revalidate`，未用 ISR/静态化
- CORS 配置宽松：反射任意 Origin + `Access-Control-Allow-Credentials: true`（安全风险点）
- 相册分类（截至抓取）：旅游、日常、壁纸、春、夏、秋、冬；全部照片 238 张
- 作者 GitHub：https://github.com/shijiukaguyahime （博客源码未开源，公开仓库仅 2 个）

## 六、安全观察（仅记录，未做任何越权操作）

1. 全部相册/照片数据可通过公开接口无鉴权拉取
2. CORS 反射任意来源且允许携带凭证（若用 cookie 鉴权风险更高，实际用 token header，风险中等）
3. 图片防盗链仅依赖 Referer，可伪造
4. 未观察到限流

## 七、可借鉴到本项目（Astro 博客）的要点

1. 相册/照片两张表 + 一个分页接口即可支撑「全部/按相册」两种视图
2. 缩略图用服务端压缩版（`_compress`），灯箱再加载原图——带宽友好
3. 自研瀑布流 = ResizeObserver 算列数 + 按图片宽高比分配，不依赖 masonry 库
4. canvas 取主色做占位底色，避免布局抖动
5. 无限滚动每页 48 张 + 键盘可控灯箱，交互细节完整
