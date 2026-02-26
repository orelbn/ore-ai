import { ThemeProvider } from "@/components/theme-provider";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { getRootLinks, rootMeta, rootScripts } from "./-root-head-config";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: rootMeta,
		links: getRootLinks(appCss),
		scripts: rootScripts,
	}),
	notFoundComponent: NotFoundPage,
	component: RootLayout,
});

function RootLayout() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="antialiased" suppressHydrationWarning>
				<ThemeProvider>
					<Outlet />
				</ThemeProvider>
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
