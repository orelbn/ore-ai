import { applyAnonymousRateLimit } from "@/lib/security/rate-limit";
import type { RateLimiterNamespace } from "@/services/cloudflare/rate-limiter";
import {
	buildUntrustedRequestResponse,
	hasTrustedPostRequestProvenance,
} from "@/lib/security/request-provenance";
import { getSessionAccessBindingId } from "./session-access-cookie";
import { requireSessionAccess } from "./verification";

type ChatAccessEnv = {
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

	const sessionSecret = input.env.SESSION_ACCESS_SECRET?.trim();
	if (!sessionSecret) {
		return {
			ok: false,
			response: Response.json(
				{ error: "Session verification is unavailable." },
				{ status: 503 },
			),
		};
	}

	const sessionAccessResponse = await requireSessionAccess({
		request: input.request,
		sessionSecret,
	});
	if (sessionAccessResponse) {
		return {
			ok: false,
			response: sessionAccessResponse,
		};
	}

	const rateLimitResponse = await applyAnonymousRateLimit({
		env: input.env,
		request: input.request,
		scope: "chat",
	});
	if (rateLimitResponse) {
		return {
			ok: false,
			response: rateLimitResponse,
		};
	}

	const sessionBindingId = await getSessionAccessBindingId({
		request: input.request,
		secret: sessionSecret,
	});
	if (!sessionBindingId) {
		return {
			ok: false,
			response: Response.json(
				{ error: "Session access required." },
				{ status: 401 },
			),
		};
	}

	return {
		ok: true,
		sessionBindingId,
	};
}
