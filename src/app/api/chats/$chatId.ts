import { getCloudflareRequestMetadata } from "@/lib/chat/cloudflare";
import { reportChatRouteError } from "@/lib/chat/error-reporting";
import { jsonError } from "@/lib/chat/http";
import { logChatApiEvent } from "@/lib/chat/logging";
import { deleteChatForUser, loadChatForUser } from "@/lib/chat/repository";
import {
	parseRouteChatId,
	requireAuthenticatedUserId,
	validateChatOwnership,
} from "@/lib/chat/route-steps";
import { ChatRequestError } from "@/lib/chat/validation";
import { createFileRoute } from "@tanstack/react-router";

type RouteContext = {
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
	context: RouteContext,
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

export async function GET(request: Request, context: RouteContext) {
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

export async function DELETE(request: Request, context: RouteContext) {
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

export const Route = createFileRoute("/api/chats/$chatId")({
	server: {
		handlers: {
			GET: ({ request, params }) => GET(request, { params }),
			DELETE: ({ request, params }) => DELETE(request, { params }),
		},
	},
});
