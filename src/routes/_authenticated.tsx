import { getProtectedRouteContext } from "@/modules/auth/logic/auth";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ location }) => getProtectedRouteContext(location.href),
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return <Outlet />;
}
