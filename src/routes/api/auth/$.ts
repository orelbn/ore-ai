import { handleAuthRequest } from "@/modules/auth/logic/auth-handler";
import { createFileRoute } from "@tanstack/react-router";

export async function GET(request: Request) {
	return handleAuthRequest(request);
}

export async function POST(request: Request) {
	return handleAuthRequest(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => GET(request),
			POST: ({ request }) => POST(request),
		},
	},
});
