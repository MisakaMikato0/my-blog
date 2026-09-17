const fs = require("fs");
const s = fs.readFileSync("public/admin/decap-cms.js", "utf8");
const keys = ["getEntry","entriesByFolder","getFileSha","widgetFor","markdownToSlate","slateToMarkdown","cms.md-mode","retrieveLocalBackup","loadEntry","registerBackend(\"github\"","fromFile","yaml-frontmatter","rich_text","emptyParagraph","MarkdownControl","VisualEditor"];
for (const k of keys) {
  const idxs = [];
  let i = 0;
  while ((i = s.indexOf(k, i)) !== -1 && idxs.length < 8) {
    idxs.push(i);
    i += k.length;
  }
  console.log(k, idxs.join(","));
}
console.log("len", s.length);

