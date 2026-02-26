import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifySessionFromRequest } from "./auth-server";

export const getAuthenticatedUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const session = await verifySessionFromRequest(request.headers);
		if (!session?.user) return null;

		return { id: session.user.id };
	},
);
