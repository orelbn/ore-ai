import { auth } from "@/services/better-auth/server";

export async function handleAuthRequest(request: Request) {
	return auth.handler(request);
}
