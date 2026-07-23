export interface Frontmatter {
  title: string;
  published: string;
  description: string;
  tags: string[];
  category: string;
  draft: boolean;
  image?: string;
  lang?: string;
}

export function parseFrontmatter(text: string): { frontmatter: Frontmatter; content: string } {
  // Simple frontmatter parser (no dependency needed in browser)
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: { title: "", published: "", description: "", tags: [], category: "", draft: false },
      content: text,
    };
  }

  const raw = match[1];
  const content = match[2];
  const fm: Record<string, any> = {};

  for (const line of raw.split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let val: any = line.slice(sep + 1).trim();

    if (key === "tags") {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch { val = []; }
    } else if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

    fm[key] = val;
  }

  return {
    frontmatter: fm as Frontmatter,
    content: content.trimStart(),
  };
}

export function buildFrontmatter(fm: Frontmatter): string {
  const tags = JSON.stringify(fm.tags).replace(/"/g, "'");
  return `---
title: "${fm.title}"
published: ${fm.published}
description: "${fm.description}"
${fm.image ? `image: ${fm.image}\n` : ""}tags: ${tags}
category: "${fm.category}"
draft: ${fm.draft}
${fm.lang ? `lang: "${fm.lang}"\n` : ""}---
`;
}
