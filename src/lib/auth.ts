import * as schema from "@/db/schema/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { drizzle } from "drizzle-orm/d1";
import { headers } from "next/headers";
import { cache } from "react";

export async function getAuth() {
	const { env } = await getCloudflareContext({ async: true });
	const db = drizzle(env.DB, { schema });

	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			usePlural: true,
		}),
		socialProviders: {
			google: {
				clientId: env.OAUTH_GOOGLE_CLIENT_ID,
				clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
			},
		},
		plugins: [nextCookies()],
	});
}

export const auth = betterAuth({
	database: drizzleAdapter({} as ReturnType<typeof drizzle>, {
		provider: "sqlite",
		usePlural: true,
	}),
	socialProviders: {
		google: {
			clientId: "",
			clientSecret: "",
		},
	},
	plugins: [nextCookies()],
});

export const getSession = cache(async () => {
	const headersList = await headers();
	const authInstance = await getAuth();
	return authInstance.api.getSession({
		headers: headersList,
	});
});

export async function verifySession() {
	const session = await getSession();
	if (!session?.session) {
		return null;
	}
	return session;
}

export async function getCurrentUser() {
	const session = await verifySession();
	if (!session) {
		return null;
	}
	return session.user;
}
