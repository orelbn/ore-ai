import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
});

function TermsPage() {
	const lastUpdated = "February 2026";

	return (
		<main className="mx-auto max-w-xl px-4 py-16 sm:py-24">
			<div className="mb-10 space-y-2">
				<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60">
					Ore AI
				</p>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					Terms of Use
				</h1>
				<p className="text-sm text-muted-foreground">
					Last updated: {lastUpdated} &#8212; and probably never again.
				</p>
			</div>

			<div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
				<section aria-labelledby="section-reality">
					<h2
						id="section-reality"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Let&#8217;s Be Realistic
					</h2>
					<p>
						This is a personal app built by one person, for that one person,
						running on a budget that would make a startup CFO cry. By using it
						you agree to these terms, which exist mostly so this page
						isn&#8217;t empty.
					</p>
				</section>

				<section aria-labelledby="section-allowed">
					<h2
						id="section-allowed"
						className="mb-2 text-base font-semibold text-foreground"
					>
						What You Can Do
					</h2>
					<p>
						Use the app. Have fun. Ask it about coffee. See if it knows
						Orel&#8217;s 10k pace (it might). Come back if you feel like it.
						That&#8217;s genuinely the full extent of the approved use cases.
					</p>
				</section>

				<section aria-labelledby="section-not-allowed">
					<h2
						id="section-not-allowed"
						className="mb-2 text-base font-semibold text-foreground"
					>
						What You Cannot Do
					</h2>
					<p>
						Try to break it, abuse it, scrape it, or do anything that would make
						a reasonable person uncomfortable. Don&#8217;t use it to do anything
						illegal, harmful, or embarrassing. If you have to ask whether
						something is allowed, it probably isn&#8217;t.
					</p>
				</section>

				<section aria-labelledby="section-liability">
					<h2
						id="section-liability"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Liability (None)
					</h2>
					<p>
						If the app is down, wrong, slow, or tells you something
						spectacularly incorrect about espresso extraction &#8212;
						that&#8217;s on you for trusting it. This is provided as-is, with no
						warranties, guarantees, SLAs, or promises of any kind. If something
						goes wrong, Orel is sorry, but also not liable.
					</p>
				</section>

				<section aria-labelledby="section-availability">
					<h2
						id="section-availability"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Availability
					</h2>
					<p>
						The app will be up when it&#8217;s up and down when it&#8217;s not.
						It may change dramatically overnight, break for a week, or gain an
						entirely new personality. Stability is not a feature. Iteration is.
					</p>
				</section>

				<section aria-labelledby="section-changes">
					<h2
						id="section-changes"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Changes to These Terms
					</h2>
					<p>
						These terms can change at any time for any reason, including but not
						limited to: Orel having a new opinion, a library update breaking
						something, or a general sense that the previous version was too
						serious. Continued use of the app means you accept whatever is
						written here at that moment.
					</p>
				</section>

				<section aria-labelledby="section-final">
					<h2
						id="section-final"
						className="mb-2 text-base font-semibold text-foreground"
					>
						Final Word
					</h2>
					<p>
						Be a decent human being while using this. That covers about 90% of
						what any terms of use is actually trying to say. The other 10% is
						lawyers justifying their billable hours, which don&#8217;t apply
						here.
					</p>
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
