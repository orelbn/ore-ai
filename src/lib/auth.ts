import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getAuthenticatedUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const { verifySessionFromRequest } = await import("./auth-server");
		const session = await verifySessionFromRequest(request.headers);
		if (!session?.user) {
			return null;
		}

		return {
			id: session.user.id,
		};
	},
);
