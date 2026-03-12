import { handlePostChat } from "@/modules/chat/server/api/handlers";
import { chatSessionAccessRouteMiddleware } from "@/modules/session/server/middleware";
import { createFileRoute } from "@tanstack/react-router";

export const maxDuration = 30;

export async function POST(request: Request) {
	return handlePostChat(request);
}

export const Route = createFileRoute("/api/chat")({
	server: {
		middleware: [chatSessionAccessRouteMiddleware],
		handlers: {
			POST: ({ request }) => POST(request),
		},
	},
});
