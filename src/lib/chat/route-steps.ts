import type { UIMessage } from "ai";
import { verifySessionFromRequest } from "@/lib/auth-server";
import { jsonError } from "./http";
import { getChatSessionOwner } from "./repository";
import { checkChatRateLimit } from "./rate-limit";
import { getClientIp, hashIpAddress } from "./security";
import {
	type ChatRequestError,
	assertRequestBodySize,
	parseAndValidateChatRequest,
	validateRouteChatId,
} from "./validation";

export async function requireAuthenticatedUserId(
	request: Request,
): Promise<string | null> {
	const session = await verifySessionFromRequest(request);
	if (!session?.user) {
		return null;
	}

	return session.user.id;
}

export async function validateChatRateLimit(input: {
	request: Request;
	userId: string;
	authSecret: string;
}): Promise<
	| {
			ok: true;
			ipHash: string | null;
	  }
	| {
			ok: false;
			response: Response;
	  }
> {
	const clientIp = getClientIp(input.request);
	const ipHash = clientIp
		? await hashIpAddress(clientIp, input.authSecret)
		: null;

	const rateLimitResult = await checkChatRateLimit({
		userId: input.userId,
		ipHash,
	});

	if (rateLimitResult.limited) {
		return {
			ok: false,
			response: jsonError(429, "Rate limit exceeded. Please try again soon."),
		};
	}

	return {
		ok: true,
		ipHash,
	};
}

export async function validateChatPostRequest(
	request: Request,
): Promise<{ id: string; message: UIMessage }> {
	const rawBody = await request.text();
	assertRequestBodySize(request.headers, rawBody);
	return parseAndValidateChatRequest(rawBody);
}

export async function validateChatOwnership(input: {
	chatId: string;
	userId: string;
	allowMissing: boolean;
}): Promise<
	| {
			ok: true;
			hasExistingSession: boolean;
	  }
	| {
			ok: false;
			response: Response;
	  }
> {
	const owner = await getChatSessionOwner(input.chatId);
	if (!owner) {
		if (input.allowMissing) {
			return {
				ok: true,
				hasExistingSession: false,
			};
		}

		return {
			ok: false,
			response: jsonError(404, "Not found"),
		};
	}

	if (owner.userId !== input.userId) {
		return {
			ok: false,
			response: jsonError(403, "Forbidden"),
		};
	}

	return {
		ok: true,
		hasExistingSession: true,
	};
}

export function parseRouteChatId(rawChatId: string): string {
	return validateRouteChatId(rawChatId);
}

export function mapChatRequestErrorToResponse(
	error: ChatRequestError,
): Response {
	if (error.status === 413) {
		return jsonError(413, "Message is too large.");
	}

	return jsonError(error.status, "Invalid request.");
}
