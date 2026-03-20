import { env } from "cloudflare:workers";
import {
	loadConversationForUser,
	saveConversationForUser,
} from "@/modules/chat/repo/conversations";
import type { ConversationMessage } from "@/modules/chat/types";
import { getCloudflareRequestMetadata } from "@/services/cloudflare";
import { resolveChatSessionAccess } from "@/modules/session/server";
import { ChatRequestError } from "../../errors/chat-request-error";
import { selectMessagesByTurnSize } from "../../client/context-window";
import { streamAssistantReply } from "../stream/assistant-stream";
import { reportChatRouteError } from "./error-reporting";
import { jsonError } from "./http";
import { logChatApiEvent } from "./logging";
import {
	mapChatRequestErrorToResponse,
	validateChatPostRequest,
} from "./request-guards";
import { resolveChatRuntimeConfig } from "../config/runtime-config";
import { CHAT_CONTEXT_MAX_BYTES } from "../../workspace/constants";

export async function handlePostChat(request: Request) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;
	let userId: string | null = null;

	try {
		const sessionAccess = await resolveChatSessionAccess({
			request,
		});
		if (!sessionAccess.ok) {
			status = sessionAccess.response.status;
			return sessionAccess.response;
		}
		userId = sessionAccess.userId;

		const { conversationId, message } = await validateChatPostRequest(request);
		const storedConversation = await loadConversationForUser({
			userId: sessionAccess.userId,
			conversationId,
		});
		const messages = selectMessagesByTurnSize({
			messages: [...(storedConversation?.messages ?? []), message],
			maxBytes: CHAT_CONTEXT_MAX_BYTES,
		}) as ConversationMessage[];
		const runtimeConfig = await resolveChatRuntimeConfig(env);
		const googleApiKey = env.GOOGLE_GENERATIVE_AI_API_KEY.trim();
		if (!googleApiKey) {
			throw new Error(
				"Missing GOOGLE_GENERATIVE_AI_API_KEY for chat model provider.",
			);
		}
		const mcpInternalSecret = env.MCP_INTERNAL_SHARED_SECRET?.trim();
		if (!mcpInternalSecret) {
			throw new Error("Missing MCP_INTERNAL_SHARED_SECRET for MCP binding.");
		}

		const response = await streamAssistantReply({
			requestId,
			agentOptions: { googleApiKey },
			messages,
			actorId: sessionAccess.userId,
			mcpServiceBinding: env.ORE_AI_MCP,
			mcpInternalSecret,
			mcpServerUrl: runtimeConfig.mcpServerUrl,
			agentSystemPrompt: runtimeConfig.agentSystemPrompt,
			onFinishMessages: async (completedMessages) => {
				await saveConversationForUser({
					userId: sessionAccess.userId,
					conversationId,
					messages: completedMessages,
				});
			},
		});
		status = response.status;
		return response;
	} catch (error) {
		if (error instanceof ChatRequestError) {
			status = error.status;
			return mapChatRequestErrorToResponse(error);
		}

		if (
			typeof error === "object" &&
			error !== null &&
			"status" in error &&
			error.status === 429
		) {
			status = 429;
			return jsonError(
				429,
				"Ore AI is a little busy right now. Please try again in a moment.",
			);
		}

		if (error instanceof Error && /429|rate limit/i.test(error.message)) {
			status = 429;
			return jsonError(
				429,
				"Ore AI is a little busy right now. Please try again in a moment.",
			);
		}

		reportChatRouteError({
			request,
			requestId,
			route: "/api/chat",
			stage: "handler",
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
			userId,
			chatId: null,
			rateLimited: status === 429,
			cfRay: cloudflare.cfRay,
			cfColo: cloudflare.cfColo,
			cfCountry: cloudflare.cfCountry,
		});
	}
}
