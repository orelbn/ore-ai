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

type RouteStepsDeps = {
	verifySessionFromRequest: typeof verifySessionFromRequest;
	getChatSessionOwner: typeof getChatSessionOwner;
	checkChatRateLimit: typeof checkChatRateLimit;
	getClientIp: typeof getClientIp;
	hashIpAddress: typeof hashIpAddress;
};

const defaultRouteStepsDeps: RouteStepsDeps = {
	verifySessionFromRequest,
	getChatSessionOwner,
	checkChatRateLimit,
	getClientIp,
	hashIpAddress,
};

type ValidateRateLimitResult =
	| {
			ok: true;
			ipHash: string | null;
	  }
	| {
			ok: false;
			response: Response;
	  };

type ValidateOwnershipResult =
	| {
			ok: true;
			hasExistingSession: boolean;
	  }
	| {
			ok: false;
			response: Response;
	  };

export function createRouteSteps(deps: RouteStepsDeps = defaultRouteStepsDeps) {
	async function requireAuthenticatedUserId(
		request: Request,
	): Promise<string | null> {
		const session = await deps.verifySessionFromRequest(request);
		if (!session?.user) {
			return null;
		}

		return session.user.id;
	}

	async function validateChatRateLimit(input: {
		request: Request;
		userId: string;
		authSecret: string;
	}): Promise<ValidateRateLimitResult> {
		const clientIp = deps.getClientIp(input.request);
		const ipHash = clientIp
			? await deps.hashIpAddress(clientIp, input.authSecret)
			: null;

		const rateLimitResult = await deps.checkChatRateLimit({
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

	async function validateChatPostRequest(
		request: Request,
	): Promise<{ id: string; message: UIMessage }> {
		const rawBody = await request.text();
		assertRequestBodySize(request.headers, rawBody);
		return parseAndValidateChatRequest(rawBody);
	}

	async function validateChatOwnership(input: {
		chatId: string;
		userId: string;
		allowMissing: boolean;
	}): Promise<ValidateOwnershipResult> {
		const owner = await deps.getChatSessionOwner(input.chatId);
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

	return {
		requireAuthenticatedUserId,
		validateChatRateLimit,
		validateChatPostRequest,
		validateChatOwnership,
		parseRouteChatId,
		mapChatRequestErrorToResponse,
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

const routeSteps = createRouteSteps();

export const requireAuthenticatedUserId = routeSteps.requireAuthenticatedUserId;
export const validateChatRateLimit = routeSteps.validateChatRateLimit;
export const validateChatPostRequest = routeSteps.validateChatPostRequest;
export const validateChatOwnership = routeSteps.validateChatOwnership;
