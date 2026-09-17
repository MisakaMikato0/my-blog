# Agent instructions

This repo uses Biome on `src/`. CI runs:

```bash
pnpm exec biome ci ./src --reporter=github
```

After changing files under `src/`, run Biome before claiming the work is done:

```bash
pnpm exec biome check <touched-files>
```

Format only files you touched:

```bash
pnpm exec biome format --write <touched-files>
```

`pnpm lint` writes (`biome check --write ./src`). Do not use it as a verification-only step. Tests passing is not a substitute for Biome.
