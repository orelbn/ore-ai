export function PrivacyPage() {
	const lastUpdated = "March 11, 2026";

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
						This is a personal project. Data is kept to a minimum and used only
						to keep the app functional, stream responses, and reduce abuse.
						Nothing is sold. Nothing is used for ads. That&#8217;s the short
						version.
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
						When you use the app, chat history is stored on the server so the
						conversation can continue across refreshes while your session stays
						active. Prompts and responses are sent to Google Gemini so the
						assistant can generate replies. Limited technical and security
						metadata may also be processed to keep the app running and to reduce
						obvious abuse. Because messages are stored to operate the chat and
						sent to the model provider, don&#8217;t share secrets or sensitive
						personal information here.
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
						The point of collecting anything here is to make the app work at
						all, keep conversation continuity available while you use it, and
						put a small speed bump in front of bots and abuse. There is no
						analytics empire, no ad funnel, and no hidden profile being built
						about you.
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
						Your data is not sold or rented. The main third-party processor is
						Google Gemini, which handles prompts and responses so the assistant
						can reply. Their handling of data is described in{" "}
						<a
							href="https://policies.google.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground underline underline-offset-2 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
						>
							Google&#8217;s Privacy Policy
						</a>
						. Gemini-specific terms are also available in{" "}
						<a
							href="https://ai.google.dev/gemini-api/terms"
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground underline underline-offset-2 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
						>
							the Gemini API Additional Terms
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
						The app keeps server-side chat history for active conversations so
						refreshes and follow-up prompts can work reliably. Starting a new
						chat stops using the previous conversation in the UI, and longer
						term retention also depends on the infrastructure providers involved
						in serving the app and generating responses.
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
					href="/"
					className="text-sm text-muted-foreground/50 underline underline-offset-2 transition-colors hover:text-muted-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
				>
					&larr; Back
				</a>
			</div>
		</main>
	);
}
