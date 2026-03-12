import {
	handleDeleteChat,
	handleGetChat,
	type ChatRouteContext,
} from "@/modules/chat/server/api/handlers";
import { createFileRoute } from "@tanstack/react-router";
export async function GET(request: Request, context: ChatRouteContext) {
	return handleGetChat(request, context);
}

export async function DELETE(request: Request, context: ChatRouteContext) {
	return handleDeleteChat(request, context);
}

export const Route = createFileRoute("/api/chats/$chatId")({
	server: {
		handlers: {
			GET: ({ request, params }) => GET(request, { params }),
			DELETE: ({ request, params }) => DELETE(request, { params }),
		},
	},
});
