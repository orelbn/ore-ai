import { AgentWorkspace } from "@/modules/chat";
import { auth } from "@/services/auth";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { Suspense } from "react";

const getSessionEntryConfig = createServerFn({
	method: "GET",
}).handler(async () => {
	const session = await auth.api.getSession({
		headers: getRequest().headers,
	});

	return {
		hasActiveSession: Boolean(session),
		turnstileSiteKey: env.TURNSTILE_SITE_KEY.trim(),
	};
});

export const Route = createFileRoute("/")({
	loader: () => getSessionEntryConfig(),
	component: Home,
});

function WorkspacePageFallback() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">
			Loading Ore AI...
		</main>
	);
}

function Home() {
	const { hasActiveSession, turnstileSiteKey } = Route.useLoaderData();

	return (
		<Suspense fallback={<WorkspacePageFallback />}>
			<AgentWorkspace
				hasActiveSession={hasActiveSession}
				turnstileSiteKey={turnstileSiteKey}
			/>
		</Suspense>
	);
}
