import { PrivacyPage } from "@/modules/legal";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});
