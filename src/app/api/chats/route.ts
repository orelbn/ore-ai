import { getCloudflareRequestMetadata } from "@/lib/chat/cloudflare";
import { reportChatRouteError } from "@/lib/chat/error-reporting";
import { jsonError } from "@/lib/chat/http";
import { logChatApiEvent } from "@/lib/chat/logging";
import { listChatSummariesForUser } from "@/lib/chat/repository";
import { requireAuthenticatedUserId } from "@/lib/chat/route-steps";

export async function GET(request: Request) {
	const startedAt = Date.now();
	const requestId = crypto.randomUUID();
	const cloudflare = getCloudflareRequestMetadata(request);
	let status = 500;
	let userId: string | null = null;

	try {
		const authenticatedUserId = await requireAuthenticatedUserId();
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
