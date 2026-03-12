import { TermsPage } from "@/modules/legal";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
});
