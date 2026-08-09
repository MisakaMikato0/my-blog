const { createHandler } = require("@waline/vercel");

module.exports = createHandler({
  // 在此设置你的后台管理密码（用于登录 /ui/login 管理评论）
  AUTH_KEY: process.env.AUTH_KEY || "",
  // LeanCloud 数据库配置（部署后需要在 Vercel 环境变量中设置）
  LEAN_ID: process.env.LEAN_ID || "",
  LEAN_KEY: process.env.LEAN_KEY || "",
  LEAN_MASTER_KEY: process.env.LEAN_MASTER_KEY || "",
  // 评论审核：true = 开启审核
  COMMENT_AUDIT: process.env.COMMENT_AUDIT || "true",
  // 安全域名（只允许你的博客域名发评论）
  SITE_DOMAINS: process.env.SITE_DOMAINS || "hakugyokurou.fun",
});
