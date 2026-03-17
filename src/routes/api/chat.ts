import { handlePostChat } from "@/modules/chat/server";
import { createFileRoute } from "@tanstack/react-router";

export const maxDuration = 30;

export async function POST(request: Request) {
	return handlePostChat(request);
}

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: ({ request }) => POST(request),
		},
	},
});
