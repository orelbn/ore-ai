import { streamAssistantReply } from "@/lib/chat/assistant-stream";
import { getCloudflareRequestMetadata } from "@/lib/chat/cloudflare";
import { reportChatRouteError } from "@/lib/chat/error-reporting";
import { jsonError } from "@/lib/chat/http";
import { logChatApiEvent } from "@/lib/chat/logging";
import {
	mapChatRequestErrorToResponse,
	requireAuthenticatedUserId,
	validateChatOwnership,
	validateChatPostRequest,
	validateChatRateLimit,
} from "@/lib/chat/route-steps";
import { ChatRequestError } from "@/lib/chat/validation";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const maxDuration = 30;

export async function POST(request: Request) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;
	let logChatId: string | null = null;
	let logUserId: string | null = null;
	let rateLimited = false;

	try {
		const userId = await requireAuthenticatedUserId(request);
		if (!userId) {
			status = 401;
			return jsonError(401, "Unauthorized");
		}
		logUserId = userId;

		const rateLimitStep = await validateChatRateLimit({
			request,
			userId,
			authSecret: env.BETTER_AUTH_SECRET,
		});
		if (!rateLimitStep.ok) {
			rateLimited = true;
			status = rateLimitStep.response.status;
			return rateLimitStep.response;
		}

		const { id: chatId, message } = await validateChatPostRequest(request);
		logChatId = chatId;

		const ownershipStep = await validateChatOwnership({
			chatId,
			userId,
			allowMissing: true,
		});
		if (!ownershipStep.ok) {
			status = ownershipStep.response.status;
			return ownershipStep.response;
		}

		const response = await streamAssistantReply({
			request,
			requestId,
			route: "/api/chat",
			aiBinding: env.AI,
			chatId,
			userId,
			message,
			ipHash: rateLimitStep.ipHash,
			hasExistingSession: ownershipStep.hasExistingSession,
			mcpServiceBinding: env.ORE_AI_MCP,
			mcpInternalSecret: env.MCP_INTERNAL_SHARED_SECRET,
		});
		status = response.status;
		return response;
	} catch (error) {
		if (error instanceof ChatRequestError) {
			status = error.status;
			return mapChatRequestErrorToResponse(error);
		}

		reportChatRouteError({
			request,
			requestId,
			route: "/api/chat",
			stage: "handler",
			userId: logUserId,
			chatId: logChatId,
			error,
		});
		status = 500;
		return jsonError(500, "Internal server error");
	} finally {
		logChatApiEvent({
			requestId,
			route: "/api/chat",
			status,
			durationMs: Date.now() - startedAt,
			userId: logUserId,
			chatId: logChatId,
			rateLimited,
			cfRay: cloudflare.cfRay,
			cfColo: cloudflare.cfColo,
			cfCountry: cloudflare.cfCountry,
		});
	}
}

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: ({ request }) => POST(request),
		},
	},
});
