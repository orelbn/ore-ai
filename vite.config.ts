import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	server: {
		port: 3000,
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tanstackStart({
			srcDirectory: "src",
			router: {
				routesDirectory: "app",
				routeFileIgnorePattern: "\\.(test|spec)\\.(ts|tsx)$",
			},
		}),
		viteReact({
			babel: {
				plugins: [
					[
						"babel-plugin-react-compiler",
						{
							target: "19",
							compilationMode: "infer",
							panicThreshold: "none",
						},
					],
				],
			},
		}),
	],
});
