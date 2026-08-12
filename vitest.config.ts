import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ["browser"],
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@components": fileURLToPath(
				new URL("./src/components", import.meta.url),
			),
			"@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
			"@constants": fileURLToPath(new URL("./src/constants", import.meta.url)),
			"@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
			"@i18n": fileURLToPath(new URL("./src/i18n", import.meta.url)),
			"@layouts": fileURLToPath(new URL("./src/layouts", import.meta.url)),
		},
	},
	test: {
		environment: "jsdom",
		ssr: false,
		setupFiles: [
			fileURLToPath(new URL("./src/test/setup.ts", import.meta.url)),
		],
		include: ["src/**/*.test.ts"],
	},
});
