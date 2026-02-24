import Image from "next/image";

export function MascotHero() {
	return (
		<div className="flex flex-col items-center gap-6">
			{/* Mascot with steam */}
			<div className="relative" aria-hidden="true">
				<div className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-2.5">
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className="steam-wisp rounded-full bg-primary/30"
							style={{
								width: "3px",
								height: "24px",
								animationDelay: `${i * 0.38}s`,
							}}
						/>
					))}
				</div>
				<Image
					src="/ore-ai.png"
					alt=""
					width={120}
					height={120}
					className="drop-shadow-2xl"
					priority
					fetchPriority="high"
				/>
			</div>

			{/* Wordmark */}
			<div className="flex items-center gap-3">
				<div className="h-px w-10 bg-primary/30" />
				<span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
					Ore&nbsp;AI
				</span>
				<div className="h-px w-10 bg-primary/30" />
			</div>

			{/* Steam animation — respects reduced motion */}
			<style>{`
				@keyframes steam-rise {
					0%   { transform: translateY(0)    scaleX(1);   opacity: 0;   }
					15%  {                                           opacity: 0.8; }
					100% { transform: translateY(-20px) scaleX(1.6); opacity: 0;  }
				}
				.steam-wisp {
					animation: steam-rise 2s ease-in-out infinite;
				}
				@media (prefers-reduced-motion: reduce) {
					.steam-wisp { animation: none; }
				}
			`}</style>
		</div>
	);
}
