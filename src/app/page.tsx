import { AgentWorkspace } from "@/components/agent-workspace/agent-workspace";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function WorkspacePageFallback() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">
			Loading workspace...
		</main>
	);
}

export default async function Home() {
	const session = await verifySession();
	if (!session?.user) redirect("/sign-in");

	return (
		<Suspense fallback={<WorkspacePageFallback />}>
			<AgentWorkspace />
		</Suspense>
	);
}
