import { MascotHero } from "@/components/layout/mascot-hero";
import { SkipToContentLink } from "@/components/ui/skip-to-content-link";
import { AboutSection } from "./about-section";
import { DocumentCards } from "./document-cards";
import { PageBackground } from "./page-background";
import { SignInButton } from "./sign-in-button";

export function SignInPage() {
	return (
		<>
			<SkipToContentLink />
			<PageBackground />

			<main
				id="main-content"
				className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8"
			>
				<div className="flex w-full max-w-lg flex-col items-center gap-4">
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
