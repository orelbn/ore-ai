import { env } from "cloudflare:workers";
import { createMiddleware } from "@tanstack/react-start";
import { enforceChatSessionAccess } from "./chat-access";

type ChatSessionAccessMiddlewareContext = {
	request: Request;
};

export async function runChatSessionAccessCheck(
	ctx: ChatSessionAccessMiddlewareContext,
): Promise<Response | null> {
	if (ctx.request.method !== "POST") {
		return null;
	}

	return enforceChatSessionAccess({
		request: ctx.request,
		env,
	});
}

export const chatSessionAccessRouteMiddleware = createMiddleware({
	type: "request",
}).server(async ({ request, next }) => {
	const accessResponse = await runChatSessionAccessCheck({ request });
	return accessResponse ?? next();
});
