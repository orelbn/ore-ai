import * as schema from "@/db/schema/auth";
import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { getLocalTestEmailPasswordConfig } from "./local-test-auth";

let authPromise: Promise<ReturnType<typeof betterAuth>> | null = null;

async function buildAuth() {
	const db = drizzle(env.DB, { schema });

	return betterAuth({
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
}

export function getAuth() {
	if (!authPromise) {
		authPromise = buildAuth();
	}
	return authPromise;
}

export async function getSessionFromHeaders(headers: Headers) {
	const authInstance = await getAuth();
	return authInstance.api.getSession({
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
