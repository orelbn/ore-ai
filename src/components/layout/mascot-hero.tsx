import { cn } from "@/lib/utils";

type MascotHeroProps = {
	className?: string;
	showSteam?: boolean;
	showWordmark?: boolean;
	imageSize?: number;
	animateWave?: boolean;
};

export function MascotHero({
	className,
	showSteam = true,
	showWordmark = true,
	imageSize = 120,
	animateWave = false,
}: MascotHeroProps) {
	const steamDelayClassByIndex = [
		"mascot-steam-delay-0",
		"mascot-steam-delay-1",
		"mascot-steam-delay-2",
	] as const;

	return (
		<div className={cn("flex flex-col items-center gap-6", className)}>
			<div className="relative" aria-hidden="true">
				{showSteam ? (
					<div className="absolute -top-3 left-1/2 flex -translate-x-[58%] gap-2.5">
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className={cn(
									"mascot-steam-wisp h-6 w-[3px] rounded-full bg-primary/30",
									steamDelayClassByIndex[index],
								)}
							/>
						))}
					</div>
				) : null}
				<img
					src="/ore-ai.webp"
					alt=""
					width={imageSize}
					height={imageSize}
					className={cn("drop-shadow-2xl", animateWave ? "mascot-wave" : null)}
					loading="eager"
					fetchPriority="high"
					decoding="async"
				/>
			</div>

			{showWordmark ? (
				<div className="flex items-center gap-3">
					<div className="h-px w-10 bg-primary/30" />
					<span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
						Ore&nbsp;AI
					</span>
					<div className="h-px w-10 bg-primary/30" />
				</div>
			) : null}
		</div>
	);
}
