import { handlePostSessionVerify } from "@/modules/session/server";
import { createFileRoute } from "@tanstack/react-router";

export async function POST(request: Request) {
	return handlePostSessionVerify(request);
}

export const Route = createFileRoute("/api/session/verify")({
	server: {
		handlers: {
			POST: ({ request }) => POST(request),
		},
	},
});
