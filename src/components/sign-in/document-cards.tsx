export function DocumentCards() {
	return (
		<div className="flex flex-col items-center gap-3">
			<p className="text-xs text-bold">
				You should definitely read these documents.
			</p>
			<div className="flex items-center justify-center gap-3">
				<a
					href="/terms"
					className="group relative flex w-36 flex-col gap-1.5 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-border/40 dark:bg-card/30 dark:hover:border-primary/50 dark:hover:bg-card/50"
				>
					<div aria-hidden="true" className="space-y-1.5">
						<div className="flex items-center gap-2">
							<div className="h-2 w-2 rounded-sm bg-primary/60 dark:bg-primary/70" />
							<div className="h-1.5 flex-1 rounded-full bg-border/60 dark:bg-border/50" />
						</div>
						<div className="h-1 w-full rounded-full bg-border/40 dark:bg-border/30" />
						<div className="h-1 w-4/5 rounded-full bg-border/40 dark:bg-border/30" />
						<div className="h-1 w-full rounded-full bg-border/40 dark:bg-border/30" />
						<div className="h-1 w-3/5 rounded-full bg-border/30 dark:bg-border/20" />
					</div>
					<span className="mt-0.5 text-[11px] font-semibold text-foreground transition-colors group-hover:text-primary">
						Terms of Use
					</span>
					<span className="text-[10px] text-muted-foreground/60">
						Required reading
					</span>
				</a>

				<a
					href="/privacy"
					className="group relative flex w-36 flex-col gap-1.5 rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border/60 hover:bg-card/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-border/30 dark:bg-card/20 dark:hover:border-border/50 dark:hover:bg-card/40"
				>
					<div aria-hidden="true" className="space-y-1.5">
						<div className="flex items-center gap-2">
							<div className="h-2 w-2 rounded-sm bg-muted-foreground/30 dark:bg-muted-foreground/25" />
							<div className="h-1.5 flex-1 rounded-full bg-border/50 dark:bg-border/40" />
						</div>
						<div className="h-1 w-full rounded-full bg-border/30 dark:bg-border/25" />
						<div className="h-1 w-4/5 rounded-full bg-border/30 dark:bg-border/25" />
						<div className="h-1 w-full rounded-full bg-border/30 dark:bg-border/25" />
						<div className="h-1 w-3/5 rounded-full bg-border/20 dark:bg-border/15" />
					</div>
					<span className="mt-0.5 text-[11px] font-semibold text-foreground transition-colors group-hover:text-foreground/80">
						Privacy Policy
					</span>
					<span className="text-[10px] text-muted-foreground/50">
						Boring but important
					</span>
				</a>
			</div>
		</div>
	);
}
