import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	resolve: {
		alias: {
			"cloudflare:workers": fileURLToPath(
				new URL("./tests/support/cloudflare-workers.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
		// Keep behavior deterministic while we reduce global/module mock usage.
		fileParallelism: false,
		clearMocks: true,
		restoreMocks: true,
		mockReset: true,
	},
});
