import * as schema from "@/db/schema/auth";
import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { getLocalTestEmailPasswordConfig } from "./local-test-auth";

const db = drizzle(env.DB, { schema });

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: "sqlite",
		usePlural: true,
	}),
	emailAndPassword: getLocalTestEmailPasswordConfig(env.BETTER_AUTH_URL),
	socialProviders: {
		google: {
			clientId: env.OAUTH_GOOGLE_CLIENT_ID,
			clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
		},
	},
});

export async function getSessionFromHeaders(headers: Headers) {
	return auth.api.getSession({
		headers,
	});
}

export async function verifySessionFromRequest(
	requestOrHeaders: Request | Headers,
) {
	const headers =
		requestOrHeaders instanceof Headers
			? requestOrHeaders
			: requestOrHeaders.headers;
	const session = await getSessionFromHeaders(headers);
	if (!session?.session) {
		return null;
	}
	return session;
}
