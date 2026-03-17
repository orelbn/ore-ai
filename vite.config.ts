import babel from "@rolldown/plugin-babel";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const reactCompilerBabelOptions = {
	presets: [reactCompilerPreset()],
} as Parameters<typeof babel>[0];

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 3000,
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart({
			srcDirectory: "src",
			server: {
				entry: "./server.ts",
			},
			router: {
				routeFileIgnorePattern: "\\.(test|spec)\\.(ts|tsx)$",
			},
		}),
		viteReact(),
		babel(reactCompilerBabelOptions),
	],
});
