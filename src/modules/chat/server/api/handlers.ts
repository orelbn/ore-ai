import { env } from "cloudflare:workers";
import { ChatRequestError } from "../../errors/chat-request-error";
import {
	deleteChatForUser,
	listChatSummariesForUser,
	loadChatForUser,
} from "../../repo";
import { streamAssistantReply } from "../stream/assistant-stream";
import { getCloudflareRequestMetadata } from "./cloudflare";
import { reportChatRouteError } from "./error-reporting";
import { jsonError } from "./http";
import { logChatApiEvent } from "./logging";
import {
	mapChatRequestErrorToResponse,
	parseRouteChatId,
	requireAuthenticatedUserId,
	validateChatOwnership,
	validateChatPostRequest,
	validateChatRateLimit,
} from "./request-guards";
import { resolveChatRuntimeConfig } from "../config/runtime-config";

export type ChatRouteContext = {
	params: {
		chatId: string;
	};
};

type AuthorizedChatScope =
	| {
			ok: true;
			chatId: string;
			userId: string;
	  }
	| {
			ok: false;
			response: Response;
			chatId: string | null;
			userId: string | null;
	  };

async function resolveAuthorizedChatScope(
	request: Request,
	context: ChatRouteContext,
): Promise<AuthorizedChatScope> {
	const userId = await requireAuthenticatedUserId(request);
	if (!userId) {
		return {
			ok: false,
			response: jsonError(401, "Unauthorized"),
			chatId: null,
			userId: null,
		};
	}

	const chatId = parseRouteChatId(context.params.chatId);
	const ownershipStep = await validateChatOwnership({
		chatId,
		userId,
		allowMissing: false,
	});
	if (!ownershipStep.ok) {
		return {
			ok: false,
			response: ownershipStep.response,
			chatId,
			userId,
		};
	}

	return {
		ok: true,
		chatId,
		userId,
	};
}

export async function handleListChats(request: Request) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;
	let userId: string | null = null;

	try {
		const authenticatedUserId = await requireAuthenticatedUserId(request);
		if (!authenticatedUserId) {
			status = 401;
			return jsonError(401, "Unauthorized");
		}

		userId = authenticatedUserId;
		const chats = await listChatSummariesForUser(userId);
		status = 200;
		return Response.json({ chats }, { status: 200 });
	} catch (error) {
		reportChatRouteError({
			request,
			requestId,
			route: "/api/chats",
			stage: "handler",
			userId,
			error,
		});
		status = 500;
		return jsonError(500, "Internal server error");
	} finally {
		logChatApiEvent({
			requestId,
			route: "/api/chats",
			status,
			durationMs: Date.now() - startedAt,
			userId,
			chatId: null,
			rateLimited: false,
			cfRay: cloudflare.cfRay,
			cfColo: cloudflare.cfColo,
			cfCountry: cloudflare.cfCountry,
		});
	}
}

export async function handlePostChat(request: Request) {
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

		const runtimeConfig = await resolveChatRuntimeConfig(env);
		const googleApiKey = (
			env as CloudflareEnv & { GOOGLE_GENERATIVE_AI_API_KEY?: string }
		).GOOGLE_GENERATIVE_AI_API_KEY?.trim();
		if (!googleApiKey) {
			throw new Error(
				"Missing GOOGLE_GENERATIVE_AI_API_KEY for chat model provider.",
			);
		}

		const response = await streamAssistantReply({
			request,
			requestId,
			route: "/api/chat",
			agentOptions: { googleApiKey },
			chatId,
			userId,
			message,
			ipHash: rateLimitStep.ipHash,
			hasExistingSession: ownershipStep.hasExistingSession,
			mcpServiceBinding: env.ORE_AI_MCP,
			mcpInternalSecret: env.MCP_INTERNAL_SHARED_SECRET,
			mcpServerUrl: runtimeConfig.mcpServerUrl,
			agentSystemPrompt: runtimeConfig.agentSystemPrompt,
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

export async function handleGetChat(
	request: Request,
	context: ChatRouteContext,
) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;
	let userId: string | null = null;
	let chatId: string | null = null;

	try {
		const scope = await resolveAuthorizedChatScope(request, context);
		if (!scope.ok) {
			status = scope.response.status;
			userId = scope.userId;
			chatId = scope.chatId;
			return scope.response;
		}

		userId = scope.userId;
		chatId = scope.chatId;
		const chat = await loadChatForUser({
			chatId: scope.chatId,
			userId: scope.userId,
		});

		if (!chat) {
			status = 404;
			return jsonError(404, "Not found");
		}

		status = 200;
		return Response.json(chat, { status: 200 });
	} catch (error) {
		if (error instanceof ChatRequestError) {
			status = error.status;
			return jsonError(error.status, "Invalid request");
		}

		reportChatRouteError({
			request,
			requestId,
			route: "/api/chats/[chatId]",
			stage: "handler_get",
			userId,
			chatId,
			error,
		});
		status = 500;
		return jsonError(500, "Internal server error");
	} finally {
		logChatApiEvent({
			requestId,
			route: "/api/chats/[chatId]",
			status,
			durationMs: Date.now() - startedAt,
			userId,
			chatId,
			rateLimited: false,
			cfRay: cloudflare.cfRay,
			cfColo: cloudflare.cfColo,
			cfCountry: cloudflare.cfCountry,
		});
	}
}

export async function handleDeleteChat(
	request: Request,
	context: ChatRouteContext,
) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;
	let userId: string | null = null;
	let chatId: string | null = null;

	try {
		const scope = await resolveAuthorizedChatScope(request, context);
		if (!scope.ok) {
			status = scope.response.status;
			userId = scope.userId;
			chatId = scope.chatId;
			return scope.response;
		}

		userId = scope.userId;
		chatId = scope.chatId;
		await deleteChatForUser({
			chatId: scope.chatId,
			userId: scope.userId,
		});

		status = 204;
		return new Response(null, { status: 204 });
	} catch (error) {
		if (error instanceof ChatRequestError) {
			status = error.status;
			return jsonError(error.status, "Invalid request");
		}

		reportChatRouteError({
			request,
			requestId,
			route: "/api/chats/[chatId]",
			stage: "handler_delete",
			userId,
			chatId,
			error,
		});
		status = 500;
		return jsonError(500, "Internal server error");
	} finally {
		logChatApiEvent({
			requestId,
			route: "/api/chats/[chatId]",
			status,
			durationMs: Date.now() - startedAt,
			userId,
			chatId,
			rateLimited: false,
			cfRay: cloudflare.cfRay,
			cfColo: cloudflare.cfColo,
			cfCountry: cloudflare.cfCountry,
		});
	}
}
