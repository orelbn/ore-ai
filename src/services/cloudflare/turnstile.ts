import { tryCatchAsync } from "@/lib/try-catch";
import { getClientIp } from "@/lib/security/ip-address";
import { z } from "zod";

const turnstileVerifyResponseSchema = z.object({
	success: z.boolean(),
	action: z.string().optional(),
	hostname: z.string().optional(),
	"error-codes": z.array(z.string()).optional(),
});

type TurnstileVerifyResponse = z.infer<typeof turnstileVerifyResponseSchema>;

export async function verifyTurnstileToken(input: {
	request: Request;
	token: string;
	secretKey: string;
	expectedAction?: string;
	expectedHostname?: string;
}): Promise<boolean> {
	const remoteIp = getClientIp(input.request);
	const payload = new URLSearchParams();
	payload.set("secret", input.secretKey);
	payload.set("response", input.token);
	payload.set("idempotency_key", crypto.randomUUID());
	if (remoteIp) {
		payload.set("remoteip", remoteIp);
	}

	const response = await verifyWithTimeout(payload);

	if (!response.ok) {
		return false;
	}

	const result = await parseTurnstileVerifyResponse(response);
	if (!result) {
		return false;
	}

	if (!result.success) {
		return false;
	}

	if (input.expectedAction && result.action !== input.expectedAction) {
		return false;
	}

	if (input.expectedHostname && result.hostname !== input.expectedHostname) {
		return false;
	}

	return true;
}

async function verifyWithTimeout(
	payload: URLSearchParams,
	attempt = 0,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, 5_000);

	try {
		const response = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				headers: {
					"content-type": "application/x-www-form-urlencoded",
				},
				body: payload.toString(),
				signal: controller.signal,
			},
		);

		if (!response.ok || attempt > 0) {
			return response;
		}

		const result = await parseTurnstileVerifyResponse(response.clone());
		if (!result) {
			return response;
		}

		if (result.success || !result["error-codes"]?.includes("internal-error")) {
			return response;
		}

		return verifyWithTimeout(payload, attempt + 1);
	} catch (error) {
		if (attempt === 0) {
			return verifyWithTimeout(payload, attempt + 1);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function parseTurnstileVerifyResponse(
	response: Response,
): Promise<TurnstileVerifyResponse | null> {
	const payload = await tryCatchAsync(response.json.bind(response))();
	if (payload.error) {
		return null;
	}

	const parsed = turnstileVerifyResponseSchema.safeParse(payload.data);
	return parsed.success ? parsed.data : null;
}
