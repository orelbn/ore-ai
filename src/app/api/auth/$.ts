import { auth } from "@/lib/auth-server";
import { createFileRoute } from "@tanstack/react-router";

async function authHandler(request: Request) {
	return auth.handler(request);
}

export async function GET(request: Request) {
	return authHandler(request);
}

export async function POST(request: Request) {
	return authHandler(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => GET(request),
			POST: ({ request }) => POST(request),
		},
	},
});
