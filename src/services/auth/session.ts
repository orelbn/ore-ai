import { betterAuth } from "better-auth/minimal";
import { buildOreAuthOptions } from "./config";

function createAuth() {
	return betterAuth(buildOreAuthOptions());
}

export async function getRequestAuthSession(request: Request) {
	return await createAuth().api.getSession({
		headers: request.headers,
	});
}

export async function createAnonymousSessionResponse(request: Request) {
	const auth = createAuth();
	const headers = new Headers({
		"content-type": "application/json",
	});
	const cookie = request.headers.get("cookie");
	if (cookie) {
		headers.set("cookie", cookie);
	}

	return auth.handler(
		new Request(new URL("/api/auth/sign-in/anonymous", request.url), {
			method: "POST",
			headers,
			body: "{}",
		}),
	);
}

export async function handleAuthRequest(request: Request) {
	return createAuth().handler(request);
}
