import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		loader: "custom",
		loaderFile: "./imageLoader.ts",
	},
};

export default nextConfig;
