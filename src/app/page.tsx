import Image from "next/image";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground">
			<p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">
				Ore AI
			</p>
			<h1 className="text-4xl font-semibold tracking-tight">
				Coming soon&#8230; I hope.
			</h1>
			<p className="max-w-sm text-center text-sm text-muted-foreground">
				But if you somehow made it here, here&#8217;s a picture of me drinking
				coffee.
			</p>
			<div className="relative mt-2 overflow-hidden rounded-xl border border-border/40 shadow-2xl">
				<Image
					src="/orel-coffee.jpg"
					alt="Orel drinking coffee"
					width={380}
					height={480}
					className="object-cover"
					priority
				/>
			</div>
		</main>
	);
}
