import { MascotHero } from "@/components/mascot-hero";
import { AboutSection } from "@/components/sign-in/about-section";
import { DocumentCards } from "@/components/sign-in/document-cards";
import { PageBackground } from "@/components/sign-in/page-background";
import { SignInButton } from "@/components/sign-in/sign-in-button";
import { SkipToContentLink } from "@/components/ui/skip-to-content-link";
import { getAuthenticatedUser } from "@/lib/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async () => {
		const user = await getAuthenticatedUser();
		if (user) {
			throw redirect({ to: "/" });
		}
	},
	component: SignInPage,
});

function SignInPage() {
	return (
		<>
			<SkipToContentLink />
			<PageBackground />

			<main
				id="main-content"
				className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:py-24"
			>
				<div className="flex w-full max-w-lg flex-col items-center gap-10">
					<MascotHero />
					<AboutSection />
					<SignInButton />
					<DocumentCards />
					<footer>
						<p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/20">
							v0 · Always Brewing
						</p>
					</footer>
				</div>
			</main>
		</>
	);
}
