import { handleListChats } from "@/modules/chat/server/api/handlers";
import { createFileRoute } from "@tanstack/react-router";

export async function GET(request: Request) {
	return handleListChats(request);
}

export const Route = createFileRoute("/api/chats")({
	server: {
		handlers: {
			GET: ({ request }) => GET(request),
		},
	},
});
