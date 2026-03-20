import { applyAnonymousRateLimit } from "@/lib/security/rate-limit";
import { tryCatch } from "@/lib/try-catch";
import { isRecord } from "@/lib/type-guards";
import { auth } from "@/services/auth";
import { verifyTurnstileToken } from "@/services/cloudflare";
import type { RateLimiterNamespace } from "@/services/cloudflare/rate-limiter";
import {
	buildUntrustedRequestResponse,
	hasTrustedPostRequestProvenance,
} from "@/lib/security/request-provenance";
import {
	SESSION_ACCESS_TURNSTILE_ACTION,
	SESSION_RESET_RESPONSE_HEADER,
} from "../constants";

type ChatAccessEnv = {
	SESSION_ACCESS_SECRET?: string;
	TURNSTILE_SECRET_KEY?: string;
	RATE_LIMITER?: RateLimiterNamespace;
};

type BlockedChatSessionAccess = {
	ok: false;
	response: Response;
};

type AllowedChatSessionAccess = {
	ok: true;
	responseHeaders: Headers;
};

export type ChatSessionAccessResult =
	| BlockedChatSessionAccess
	| AllowedChatSessionAccess;

function jsonError(status: number, error: string) {
	return Response.json({ error }, { status });
}

function buildSessionResetResponse() {
	const response = jsonError(
		401,
		"We couldn't keep your chat session active. Restarting chat is required.",
	);
	response.headers.set(SESSION_RESET_RESPONSE_HEADER, "true");
	return response;
}

async function readTurnstileToken(request: Request) {
	const rawBody = await request.text();
	const payload = tryCatch(JSON.parse)(rawBody);
	if (payload.error || !isRecord(payload.data)) {
		return null;
	}

	const token = payload.data.turnstileToken;
	return typeof token === "string" && token.trim().length > 0 ? token : null;
}

export async function resolveChatSessionAccess(input: {
	request: Request;
	env: ChatAccessEnv;
}): Promise<ChatSessionAccessResult> {
	const request = input.request as Request;
	const env = input.env;

	if (!hasTrustedPostRequestProvenance(request)) {
		return {
			ok: false,
			response: buildUntrustedRequestResponse(),
		};
	}

	const existingSession = await auth.api.getSession({
		headers: request.headers,
	});
	if (existingSession) {
		const rateLimitResponse = await applyAnonymousRateLimit({
			env,
			request,
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
			responseHeaders: new Headers(),
		};
	}

	if (request.headers.get("x-ore-active-session") === "true") {
		return {
			ok: false,
			response: buildSessionResetResponse(),
		};
	}

	const turnstileSecretKey = env.TURNSTILE_SECRET_KEY?.trim();
	if (!turnstileSecretKey) {
		return {
			ok: false,
			response: jsonError(503, "Session verification is unavailable."),
		};
	}

	const verificationRateLimitResponse = await applyAnonymousRateLimit({
		env,
		request,
		scope: "session_verify",
	});
	if (verificationRateLimitResponse) {
		return {
			ok: false,
			response: verificationRateLimitResponse,
		};
	}

	const turnstileToken = await readTurnstileToken(new Request(request));
	if (!turnstileToken) {
		return {
			ok: false,
			response: jsonError(401, "Session access required."),
		};
	}

	const verified = await verifyTurnstileToken({
		request,
		token: turnstileToken,
		secretKey: turnstileSecretKey,
		expectedAction: SESSION_ACCESS_TURNSTILE_ACTION,
		expectedHostname: new URL(request.url).hostname,
	});
	if (!verified) {
		return {
			ok: false,
			response: jsonError(403, "Session verification failed."),
		};
	}

	const rateLimitResponse = await applyAnonymousRateLimit({
		env,
		request,
		scope: "chat",
	});
	if (rateLimitResponse) {
		return {
			ok: false,
			response: rateLimitResponse,
		};
	}

	const responseHeaders = new Headers();
	const signInAnonymous = (
		auth.api as typeof auth.api & {
			signInAnonymous: (input: {
				headers: Headers;
				returnHeaders: true;
			}) => Promise<{ headers: Headers }>;
		}
	).signInAnonymous;
	const anonymousSession = await signInAnonymous({
		headers: request.headers,
		returnHeaders: true,
	});
	for (const cookie of anonymousSession.headers.getSetCookie()) {
		responseHeaders.append("set-cookie", cookie);
	}

	return {
		ok: true,
		responseHeaders,
	};
}
