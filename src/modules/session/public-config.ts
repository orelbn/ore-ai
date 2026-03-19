import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import {
	getSessionAccessBindingId,
	hasValidSessionAccessCookie,
} from "./server/session-access-cookie";

type SessionPublicConfigEnv = {
	SESSION_ACCESS_SECRET: string;
	TURNSTILE_SITE_KEY: string;
};

export async function resolveSessionAccessPublicConfig(input: {
	request: Request;
	env: SessionPublicConfigEnv;
}) {
	const secret = input.env.SESSION_ACCESS_SECRET.trim();
	const hasSessionAccess = secret
		? await hasValidSessionAccessCookie({
				request: input.request,
				secret,
			})
		: false;
	const sessionBindingId = secret
		? await getSessionAccessBindingId({
				request: input.request,
				secret,
			})
		: null;

	return {
		turnstileSiteKey: input.env.TURNSTILE_SITE_KEY.trim(),
		hasSessionAccess: Boolean(hasSessionAccess && sessionBindingId),
		sessionBindingId,
	};
}

export const getSessionAccessPublicConfig = createServerFn({
	method: "GET",
}).handler(() => {
	return resolveSessionAccessPublicConfig({
		request: getRequest(),
		env,
	});
});
