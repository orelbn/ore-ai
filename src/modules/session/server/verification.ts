import { env } from "cloudflare:workers";
import { tryCatch } from "@/lib/try-catch";
import {
	buildUntrustedRequestResponse,
	hasTrustedPostRequestProvenance,
} from "@/lib/security/request-provenance";
import {
	createAnonymousSessionResponse,
	getRequestAuthSession,
} from "@/services/auth";
import { applyAnonymousRateLimit } from "@/lib/security/rate-limit";
import { isRecord } from "@/lib/type-guards";
import { verifyTurnstileToken } from "@/services/cloudflare";
import {
	SESSION_ACCESS_TURNSTILE_ACTION,
	SESSION_VERIFY_MAX_BODY_BYTES,
} from "../constants";
import { z } from "zod";

function jsonError(status: number, error: string) {
	return Response.json({ error }, { status });
}

const verificationRequestBodySchema = z.object({
	token: z.string().trim().min(1),
});

function parseToken(rawBody: string): string | null {
	const payload = tryCatch(JSON.parse)(rawBody);
	if (payload.error || !isRecord(payload.data)) {
		return null;
	}

	const parsed = verificationRequestBodySchema.safeParse(payload.data);
	return parsed.success ? parsed.data.token : null;
}

function assertVerificationRequestBodySize(
	headers: Headers,
	rawBody: string,
): void {
	const contentLength = headers.get("content-length");
	if (contentLength) {
		const lengthValue = Number.parseInt(contentLength, 10);
		if (
			Number.isFinite(lengthValue) &&
			lengthValue > SESSION_VERIFY_MAX_BODY_BYTES
		) {
			throw new Error("Verification request body is too large.");
		}
	}

	const encodedLength = new TextEncoder().encode(rawBody).byteLength;
	if (encodedLength > SESSION_VERIFY_MAX_BODY_BYTES) {
		throw new Error("Verification request body is too large.");
	}
}

export async function requireSessionAccess(input: { request: Request }) {
	const session = await getRequestAuthSession({
		request: input.request,
		env,
	});

	if (session) {
		return null;
	}

	return jsonError(401, "Session access required.");
}

export async function handlePostSessionVerify(request: Request) {
	const turnstileSecretKey = env.TURNSTILE_SECRET_KEY.trim();
	const sessionSecret = env.SESSION_ACCESS_SECRET.trim();

	if (!turnstileSecretKey || !sessionSecret) {
		throw new Error("Missing session verification configuration.");
	}

	if (!hasTrustedPostRequestProvenance(request)) {
		return buildUntrustedRequestResponse();
	}

	const rawBody = await request.text();
	try {
		assertVerificationRequestBodySize(request.headers, rawBody);
	} catch {
		return jsonError(413, "Invalid request.");
	}
	const token = parseToken(rawBody);
	if (!token) {
		return jsonError(400, "Invalid request.");
	}

	const rateLimitResponse = await applyAnonymousRateLimit({
		env,
		request,
		scope: "session_verify",
	});
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const verified = await verifyTurnstileToken({
		request,
		token,
		secretKey: turnstileSecretKey,
		expectedAction: SESSION_ACCESS_TURNSTILE_ACTION,
		expectedHostname: new URL(request.url).hostname,
	});
	if (!verified) {
		return jsonError(403, "Session verification failed.");
	}

	const existingSession = await getRequestAuthSession({
		request,
		env,
	});
	if (existingSession) {
		return new Response(null, { status: 204 });
	}

	const authResponse = await createAnonymousSessionResponse({
		request,
		env,
	});
	if (!authResponse.ok) {
		return jsonError(503, "Session verification is unavailable.");
	}

	const setCookie = authResponse.headers.get("set-cookie");
	if (!setCookie) {
		return jsonError(503, "Session verification is unavailable.");
	}

	const response = new Response(null, { status: 204 });
	response.headers.append("Set-Cookie", setCookie);
	return response;
}
