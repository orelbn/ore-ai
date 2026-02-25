import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});

function PrivacyPage() {
	const lastUpdated = "February 2026";

	return (
		<main className="mx-auto max-w-xl px-4 py-16 sm:py-24">
			<div className="mb-10 space-y-2">
				<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60">
					Ore AI
				</p>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					Privacy Policy
				</h1>
				<p className="text-sm text-muted-foreground">
					Last updated: {lastUpdated}
				</p>
			</div>

			<div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
				<section aria-labelledby="section-short">
					<h2
						id="section-short"
						className="mb-2 text-base font-semibold text-foreground"
					>
						The Short Version
					</h2>
					<p>
						This is a personal project. Data is collected only to keep the app
						functional and to identify and stop abuse or malicious activity.
						Nothing is sold. Nothing is shared. That&#8217;s about it.
					</p>
				</section>

				<section aria-labelledby="section-collect">
					<h2
						id="section-collect"
						className="mb-2 text-base font-semibold text-foreground"
					>
						What Is Collected
					</h2>
					<p>
						When you sign in with Google, basic account information is stored:
						your name, email address, and profile picture. Your session is
						tracked so you stay logged in. Usage activity &#8212; such as which
						features you access and when &#8212; may be logged to detect unusual
						or abusive behaviour.
					</p>
				</section>

				<section aria-labelledby="section-why">
					<h2
						id="section-why"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Why It&#8217;s Collected
					</h2>
					<p>
						The only reasons data is collected are to make authentication work,
						to keep your session active, and to identify and block abuse or
						malicious actors. There is no advertising, no analytics platform,
						and no interest in your data beyond keeping the app functional and
						safe.
					</p>
				</section>

				<section aria-labelledby="section-sharing">
					<h2
						id="section-sharing"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Sharing
					</h2>
					<p>
						Your data is not sold, rented, or shared with third parties. The
						exception is Google, whose OAuth service is used for sign-in &#8212;
						their handling of your data is governed by{" "}
						<a
							href="https://policies.google.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground underline underline-offset-2 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
						>
							Google&#8217;s Privacy Policy
						</a>
						.
					</p>
				</section>

				<section aria-labelledby="section-retention">
					<h2
						id="section-retention"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Data Retention
					</h2>
					<p>
						Account data is kept for as long as you have an active account. If
						you want your data deleted, reach out and it will be removed.
					</p>
				</section>

				<section aria-labelledby="section-contact">
					<h2
						id="section-contact"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Contact
					</h2>
					<p>Questions? Orel built this. Find him and ask.</p>
				</section>
			</div>

			<div className="mt-12">
				<a
					href="/sign-in"
					className="text-sm text-muted-foreground/50 underline underline-offset-2 transition-colors hover:text-muted-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
				>
					&larr; Back
				</a>
			</div>
		</main>
	);
}
