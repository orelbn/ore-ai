import { handleAuthRequest } from "@/services/auth";
import { createFileRoute } from "@tanstack/react-router";

async function handleRequest(request: Request) {
	return handleAuthRequest(request);
}

export async function GET(request: Request) {
	return handleRequest(request);
}

export async function POST(request: Request) {
	return handleRequest(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => GET(request),
			POST: ({ request }) => POST(request),
		},
	},
});
