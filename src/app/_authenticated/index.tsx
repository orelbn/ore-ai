import { AgentWorkspace } from "@/components/agent-workspace/agent-workspace";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_authenticated/")({
	component: Home,
});

function WorkspacePageFallback() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">
			Loading workspace...
		</main>
	);
}

function Home() {
	return (
		<Suspense fallback={<WorkspacePageFallback />}>
			<AgentWorkspace />
		</Suspense>
	);
}
