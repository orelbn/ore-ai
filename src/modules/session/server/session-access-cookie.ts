import {
	decodeSignedCookiePayload,
	encodeSignedCookiePayload,
	getCookieValue,
	hasValidCookieSignature,
	signCookiePayload,
} from "@/lib/security/signed-cookie";
import {
	SESSION_ACCESS_COOKIE_MAX_AGE_SECONDS,
	SESSION_ACCESS_COOKIE_NAME,
} from "../constants";
import { z } from "zod";

type VerificationCookiePayload = {
	id: string;
	exp: number;
};

const verificationCookiePayloadSchema = z.object({
	id: z.string().trim().min(1),
	exp: z.number(),
});

async function readSessionAccessCookiePayload(input: {
	request: Request;
	secret: string;
}): Promise<VerificationCookiePayload | null> {
	const rawValue = getCookieValue(input.request, SESSION_ACCESS_COOKIE_NAME);
	if (!rawValue) {
		return null;
	}

	const [payloadPart, signaturePart] = rawValue.split(".");
	if (!payloadPart || !signaturePart) {
		return null;
	}

	const isValidSignature = await hasValidCookieSignature({
		encodedPayload: payloadPart,
		signature: signaturePart,
		secret: input.secret,
	});
	if (!isValidSignature) {
		return null;
	}

	const payloadJson = decodeSignedCookiePayload(payloadPart);
	if (!payloadJson) {
		return null;
	}

	try {
		const parsed = verificationCookiePayloadSchema.safeParse(
			JSON.parse(payloadJson),
		);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export async function getSessionAccessBindingId(input: {
	request: Request;
	secret: string;
}): Promise<string | null> {
	const payload = await readSessionAccessCookiePayload(input);
	return payload?.id ?? null;
}

export async function hasValidSessionAccessCookie(input: {
	request: Request;
	secret: string;
	now?: Date;
}): Promise<boolean> {
	const payload = await readSessionAccessCookiePayload(input);
	if (!payload) {
		return false;
	}

	const now = input.now ?? new Date();
	return payload.exp > now.getTime();
}

export async function createSessionAccessCookie(
	secret: string,
	sessionId: string = crypto.randomUUID(),
): Promise<string> {
	const payload: VerificationCookiePayload = {
		id: sessionId,
		exp: Date.now() + SESSION_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000,
	};
	const payloadPart = encodeSignedCookiePayload(JSON.stringify(payload));
	const signaturePart = await signCookiePayload(payloadPart, secret);
	return [
		`${SESSION_ACCESS_COOKIE_NAME}=${payloadPart}.${signaturePart}`,
		`Max-Age=${SESSION_ACCESS_COOKIE_MAX_AGE_SECONDS}`,
		"Path=/",
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
	].join("; ");
}
