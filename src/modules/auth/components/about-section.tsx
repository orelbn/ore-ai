export function AboutSection() {
	return (
		<div className="space-y-5 text-center">
			<div>
				<h1 className="text-pretty text-2xl font-bold tracking-tight text-foreground">
					Ever wanted to know more about Orel?
				</h1>
				<h2 className="mt-2 text-lg font-semibold text-foreground">
					Probably not, but here it is anyway.
				</h2>
			</div>

			<div className="mx-auto max-w-2xl space-y-4 text-balanced text-base leading-relaxed text-muted-foreground">
				<p>
					Orel is a software developer who drinks too much coffee, runs for fun,
					lifts weights, plays soccer, follows MMA, reads, meditates, and is
					always trying to learn new things.
				</p>
				<p>
					Ore AI is an agent built around all of that: it knows Orel, has tools
					for his interests, and exists mostly because building it sounded like
					a fun learning experience.
				</p>
				<p>
					If you've decided, against all reasonable judgement, to give it a try
					sign in below.
				</p>
			</div>
		</div>
	);
}
