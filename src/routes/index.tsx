import { AgentWorkspace } from "@/modules/workspace";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Suspense } from "react";
import { hydrateInitialConversationSeed } from "./-index.hydration";
import { loadIndexRouteData } from "./-index.loader";

const getSessionEntryConfig = createServerFn({
	method: "GET",
}).handler(async () => loadIndexRouteData(getRequest().headers));

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
	const { hasActiveSession, initialConversationJson, turnstileSiteKey } =
		Route.useLoaderData();
	const initialConversation = hydrateInitialConversationSeed(
		initialConversationJson,
	);

	return (
		<Suspense fallback={<WorkspacePageFallback />}>
			<AgentWorkspace
				hasActiveSession={hasActiveSession}
				initialConversation={initialConversation}
				turnstileSiteKey={turnstileSiteKey}
			/>
		</Suspense>
	);
}
