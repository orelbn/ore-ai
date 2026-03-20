import { getClientIp, hashIpAddress } from "./ip-address";
import {
	consumeCloudflareRateLimit,
	type RateLimiterNamespace,
} from "@/services/cloudflare/rate-limiter";

export type RateLimitPolicy = {
	name: string;
	limit: number;
	windowSeconds: number;
};

export type RateLimitConsumeResult =
	| {
			allowed: true;
	  }
	| {
			allowed: false;
			retryAfterSeconds: number;
	  };

type RateLimitScope = "chat" | "session_verify";
type RateLimiterEnv = {
	BETTER_AUTH_SECRET?: string;
	RATE_LIMITER?: RateLimiterNamespace;
};

type RateLimitConfig = {
	bucket: string;
	policies: RateLimitPolicy[];
};

const RATE_LIMITED_ERROR = "Too many requests. Please try again later.";
const RATE_LIMIT_UNAVAILABLE_ERROR = "Service temporarily unavailable.";

const RATE_LIMITS: Record<RateLimitScope, RateLimitConfig> = {
	chat: {
		bucket: "chat",
		policies: [
			{ name: "1m", limit: 12, windowSeconds: 60 },
			{ name: "30m", limit: 60, windowSeconds: 30 * 60 },
		],
	},
	session_verify: {
		bucket: "session_verify",
		policies: [
			{ name: "10m", limit: 5, windowSeconds: 10 * 60 },
			{ name: "24h", limit: 20, windowSeconds: 24 * 60 * 60 },
		],
	},
};

function buildLimitedResponse(retryAfterSeconds: number): Response {
	return Response.json(
		{ error: RATE_LIMITED_ERROR, retryAfterSeconds },
		{
			status: 429,
			headers: {
				"Retry-After": String(retryAfterSeconds),
			},
		},
	);
}

function buildUnavailableResponse(): Response {
	return Response.json(
		{ error: RATE_LIMIT_UNAVAILABLE_ERROR },
		{ status: 503 },
	);
}

async function getPrincipal(request: Request, secret: string): Promise<string> {
	const clientIp = getClientIp(request) ?? "unknown";
	return hashIpAddress(clientIp, secret);
}

async function consumeRateLimit(input: {
	env: RateLimiterEnv;
	request: Request;
	scope: RateLimitScope;
	nowMs?: number;
}): Promise<RateLimitConsumeResult> {
	const secret = input.env.BETTER_AUTH_SECRET?.trim();
	const namespace = input.env.RATE_LIMITER;
	if (!secret || !namespace) {
		throw new Error("Rate limiter configuration is unavailable.");
	}

	const principal = await getPrincipal(input.request, secret);
	const config = RATE_LIMITS[input.scope];
	return consumeCloudflareRateLimit({
		namespace,
		bucket: config.bucket,
		principal,
		policies: config.policies,
		nowMs: input.nowMs,
	});
}

export async function applyAnonymousRateLimit(input: {
	env: RateLimiterEnv;
	request: Request;
	scope: RateLimitScope;
	nowMs?: number;
}): Promise<Response | null> {
	try {
		const result = await consumeRateLimit(input);
		return result.allowed
			? null
			: buildLimitedResponse(result.retryAfterSeconds);
	} catch {
		return buildUnavailableResponse();
	}
}

export const rateLimitResponses = {
	limited: buildLimitedResponse,
	unavailable: buildUnavailableResponse,
};
