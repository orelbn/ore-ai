"use client";

import { MascotHero } from "../mascot-hero";

export function ConversationEmptyState() {
	return (
		<div className="mb-4 flex flex-col items-center gap-2 sm:gap-3">
			<MascotHero
				className="scale-[0.82] sm:scale-[0.94] md:scale-100"
				showSteam
				showWordmark={false}
				imageSize={168}
				animateWave
			/>
			<p className="font-mono text-3xl font-semibold tracking-[0.08em] text-primary drop-shadow-sm sm:text-4xl">
				Hi
			</p>
		</div>
	);
}
