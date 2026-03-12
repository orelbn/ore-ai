import { SignInPage } from "@/modules/auth/components/sign-in-page";
import { redirectAuthenticatedUser } from "@/modules/auth/logic/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: () => redirectAuthenticatedUser("/"),
	component: SignInPage,
});
