---
name: biome-check
description: Use when editing, linting, formatting, finishing, committing, reviewing, or claiming complete any work in a repo that uses Biome (biome.json, package.json lint/format scripts, or CI biome ci). Especially the my-blog Astro repo. Also use when the user mentions Biome, lint, format, or code quality. Do not skip after small HTML, CSS, CMS, or test edits.
---

# Biome Check

Biome is a completion gate, not an optional extra. Tests passing is not a substitute.

## When it applies

- The repo has `biome.json`, or scripts/CI run `biome check` / `biome ci` / `biome format`.
- You changed files Biome covers. In this blog that is `src/` (including `src/test/`).
- You are about to say the work is done, fixed, or ready.

## Commands

Prefer check-only, matching CI. Do not use write-mode as "verification".

This blog:

```bash
pnpm exec biome check <touched-files>
pnpm exec biome ci ./src
```

CI runs `pnpm exec biome ci ./src --reporter=github`.

- `pnpm lint` is `biome check --write ./src` -- it mutates files. Do not use it to prove cleanliness.
- Format only files you touched: `pnpm exec biome format --write <touched-files>`.

In other repos, read `package.json` and CI first, then run that project's Biome command.

## Rules

1. Run Biome after the change, on the touched files or the same path CI uses.
2. Read the full output and exit code. Exit 0 is the only pass.
3. Fix formatting/lint you introduced. Do not sweep unrelated pre-existing findings unless they fail the command you ran.
4. Do not claim complete, fixed, or ready while Biome is failing or unrun.
