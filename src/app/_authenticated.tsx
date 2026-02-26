import { getAuthenticatedUser } from "@/lib/auth";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

function getSignInRedirect(locationHref: string) {
	return redirect({
		to: "/sign-in",
		search: { redirect: locationHref },
	});
}

async function getProtectedRouteContext(locationHref: string) {
	const user = await getAuthenticatedUser();
	if (!user) throw getSignInRedirect(locationHref);

	return { user };
}

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ location }) => getProtectedRouteContext(location.href),
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return <Outlet />;
}
