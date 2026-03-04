import { ThemeProvider } from "@/components/theme-provider";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { getRootLinks, rootMeta, rootScripts } from "./-root-head-config";
import appCss from "./globals.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: rootMeta,
			links: getRootLinks(appCss),
			scripts: rootScripts,
		}),
		notFoundComponent: NotFoundPage,
		component: RootLayout,
	},
);

function RootLayout() {
	const { queryClient } = Route.useRouteContext();

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="antialiased" suppressHydrationWarning>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider>
						<Outlet />
					</ThemeProvider>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}

function NotFoundPage() {
	return (
		<main className="flex min-h-screen items-center justify-center px-6">
			<p className="text-sm text-muted-foreground">Page not found.</p>
		</main>
	);
}
