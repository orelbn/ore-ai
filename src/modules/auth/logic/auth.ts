import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { verifySessionFromRequest } from "@/services/better-auth/server";

export const getAuthenticatedUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const session = await verifySessionFromRequest(request.headers);
		if (!session?.user) return null;

		return { id: session.user.id };
	},
);

export function getSignInRedirect(locationHref: string) {
	return redirect({
		to: "/sign-in",
		search: { redirect: locationHref },
	});
}

export async function getProtectedRouteContext(locationHref: string) {
	const user = await getAuthenticatedUser();
	if (!user) throw getSignInRedirect(locationHref);

	return { user };
}

export async function redirectAuthenticatedUser(to = "/") {
	const user = await getAuthenticatedUser();
	if (user) {
		throw redirect({ to });
	}
}
