import { env } from "cloudflare:workers";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { BetterAuthOptions } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const oreAuthCookiePrefix = "ore_ai";
const oreAuthPlugins = [anonymous()];

export function buildOreAuthOptions(): BetterAuthOptions {
	const secret = env.BETTER_AUTH_SECRET.trim();
	const baseURL = env.BETTER_AUTH_URL.trim();
	const database = drizzle(env.DB);

	if (!secret || !baseURL) {
		throw new Error("Missing Better Auth configuration.");
	}

	return {
		baseURL,
		secret,
		database: drizzleAdapter(database, {
			provider: "sqlite",
			schema,
			usePlural: true,
		}),
		advanced: {
			cookiePrefix: oreAuthCookiePrefix,
		},
		plugins: oreAuthPlugins,
	};
}
