import { applyAnonymousRateLimit } from "@/lib/security/rate-limit";
import { getRequestAuthSession } from "@/services/auth";
import type { RateLimiterNamespace } from "@/services/cloudflare/rate-limiter";
import type { BetterAuthEnv } from "@/services/auth";
import {
	buildUntrustedRequestResponse,
	hasTrustedPostRequestProvenance,
} from "@/lib/security/request-provenance";

type ChatAccessEnv = BetterAuthEnv & {
	SESSION_ACCESS_SECRET?: string;
	RATE_LIMITER?: RateLimiterNamespace;
};

type BlockedChatSessionAccess = {
	ok: false;
	response: Response;
};

type AllowedChatSessionAccess = {
	ok: true;
	sessionBindingId: string;
};

export type ChatSessionAccessResult =
	| BlockedChatSessionAccess
	| AllowedChatSessionAccess;

export async function resolveChatSessionAccess(input: {
	request: Request;
	env: ChatAccessEnv;
}): Promise<ChatSessionAccessResult> {
	if (!hasTrustedPostRequestProvenance(input.request)) {
		return {
			ok: false,
			response: buildUntrustedRequestResponse(),
		};
	}

	const session = await getRequestAuthSession({
		request: input.request,
		env: input.env,
	});
	if (!session) {
		return {
			ok: false,
			response: Response.json(
				{ error: "Session access required." },
				{ status: 401 },
			),
		};
	}

	const rateLimitResponse = await applyAnonymousRateLimit({
		env: {
			SESSION_ACCESS_SECRET: input.env.SESSION_ACCESS_SECRET,
			RATE_LIMITER: input.env.RATE_LIMITER,
		},
		request: input.request,
		scope: "chat",
	});
	if (rateLimitResponse) {
		return {
			ok: false,
			response: rateLimitResponse,
		};
	}

	return {
		ok: true,
		sessionBindingId: session.session.id,
	};
}
