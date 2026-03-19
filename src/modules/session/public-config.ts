import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import { getRequestAuthSession } from "@/services/auth";
import type { BetterAuthEnv } from "@/services/auth";

type SessionPublicConfigEnv = BetterAuthEnv & {
	TURNSTILE_SITE_KEY: string;
};

export async function resolveSessionAccessPublicConfig(input: {
	request: Request;
	env: SessionPublicConfigEnv;
}) {
	const session = await getRequestAuthSession({
		request: input.request,
		env: input.env,
	});

	return {
		turnstileSiteKey: input.env.TURNSTILE_SITE_KEY.trim(),
		hasSessionAccess: Boolean(session?.session.id),
		sessionBindingId: session?.session.id ?? null,
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
