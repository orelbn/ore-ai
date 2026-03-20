import { env } from "cloudflare:workers";
import { getCloudflareRequestMetadata } from "@/services/cloudflare";
import { resolveChatSessionAccess } from "@/modules/session/server";
import { ChatRequestError } from "../../errors/chat-request-error";
import { streamAssistantReply } from "../stream/assistant-stream";
import { reportChatRouteError } from "./error-reporting";
import { jsonError } from "./http";
import { logChatApiEvent } from "./logging";
import {
	mapChatRequestErrorToResponse,
	validateChatPostRequest,
} from "./request-guards";
import { resolveChatRuntimeConfig } from "../config/runtime-config";

export async function handlePostChat(request: Request) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;

	try {
		const sessionAccess = await resolveChatSessionAccess({
			request,
			env,
		});
		if (!sessionAccess.ok) {
			status = sessionAccess.response.status;
			return sessionAccess.response;
		}

		const messageIntegritySecret = env.BETTER_AUTH_SECRET?.trim();
		if (!messageIntegritySecret) {
			throw new Error(
				"Missing BETTER_AUTH_SECRET for auth and chat message integrity.",
			);
		}
		const { conversationId, messages } = await validateChatPostRequest(
			request,
			{
				messageIntegritySecret,
			},
		);
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
			conversationId,
			messages,
			actorId: requestId,
			mcpServiceBinding: env.ORE_AI_MCP,
			mcpInternalSecret,
			mcpServerUrl: runtimeConfig.mcpServerUrl,
			agentSystemPrompt: runtimeConfig.agentSystemPrompt,
			messageIntegritySecret,
		});
		status = response.status;
		return withSessionAccessHeaders(response, sessionAccess.responseHeaders);
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
			userId: null,
			chatId: null,
			rateLimited: status === 429,
			cfRay: cloudflare.cfRay,
			cfColo: cloudflare.cfColo,
			cfCountry: cloudflare.cfCountry,
		});
	}
}

function withSessionAccessHeaders(
	response: Response,
	sessionAccessHeaders: Headers,
): Response {
	const headers = new Headers(response.headers);

	for (const [key, value] of sessionAccessHeaders.entries()) {
		if (key.toLowerCase() === "set-cookie") {
			headers.append(key, value);
			continue;
		}
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
