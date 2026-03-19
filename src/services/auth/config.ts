import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { BetterAuthOptions } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import { SESSION_ACCESS_COOKIE_NAME } from "@/modules/session/constants";
import * as schema from "./schema";
import type { BetterAuthEnv } from "./types";

export const ORE_AUTH_COOKIE_NAMES = {
	sessionToken: SESSION_ACCESS_COOKIE_NAME,
	sessionData: "ore_ai_session_data",
	dontRemember: "ore_ai_dont_remember",
} as const;

export function buildOreAuthOptions(env: BetterAuthEnv): BetterAuthOptions {
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
			cookies: {
				session_token: {
					name: ORE_AUTH_COOKIE_NAMES.sessionToken,
				},
				session_data: {
					name: ORE_AUTH_COOKIE_NAMES.sessionData,
				},
				dont_remember: {
					name: ORE_AUTH_COOKIE_NAMES.dontRemember,
				},
			},
		},
		plugins: [anonymous()],
	};
}
