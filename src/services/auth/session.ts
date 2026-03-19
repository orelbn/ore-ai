import { betterAuth } from "better-auth/minimal";
import { buildOreAuthOptions } from "./config";
import type { BetterAuthEnv } from "./types";

function createAuth(env: BetterAuthEnv) {
	return betterAuth(buildOreAuthOptions(env));
}

export async function getRequestAuthSession(input: {
	request: Request;
	env: BetterAuthEnv;
}) {
	return await createAuth(input.env).api.getSession({
		headers: input.request.headers,
	});
}

export async function createAnonymousSessionResponse(input: {
	request: Request;
	env: BetterAuthEnv;
}) {
	const auth = createAuth(input.env);
	const headers = new Headers(input.request.headers);
	headers.delete("content-length");
	headers.set("content-type", "application/json");

	return auth.handler(
		new Request(new URL("/api/auth/sign-in/anonymous", input.request.url), {
			method: "POST",
			headers,
			body: "{}",
		}),
	);
}

export async function handleAuthRequest(input: {
	request: Request;
	env: BetterAuthEnv;
}) {
	return createAuth(input.env).handler(input.request);
}
