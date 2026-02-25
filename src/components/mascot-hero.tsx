import Image from "next/image";
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
	return (
		<div className={cn("flex flex-col items-center gap-6", className)}>
			<div className="relative" aria-hidden="true">
				{showSteam ? (
					<div className="absolute -top-3 left-1/2 flex -translate-x-[58%] gap-2.5">
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className="steam-wisp rounded-full bg-primary/30"
								style={{
									width: "3px",
									height: "24px",
									animationDelay: `${index * 0.38}s`,
								}}
							/>
						))}
					</div>
				) : null}
				<Image
					src="/ore-ai.webp"
					alt=""
					width={imageSize}
					height={imageSize}
					className={cn("drop-shadow-2xl", animateWave ? "mascot-wave" : null)}
					priority
					fetchPriority="high"
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

			<style>{`
				@keyframes steam-rise {
					0%   { transform: translateY(0) scaleX(1); opacity: 0; }
					15%  { opacity: 0.8; }
					100% { transform: translateY(-20px) scaleX(1.6); opacity: 0; }
				}
				@keyframes mascot-wave {
					0%   { transform: rotate(0deg) translateY(0); }
					10%  { transform: rotate(-3deg) translateY(-1px); }
					20%  { transform: rotate(2deg) translateY(-1px); }
					30%  { transform: rotate(-2deg) translateY(-1px); }
					40%  { transform: rotate(1deg) translateY(0); }
					100% { transform: rotate(0deg) translateY(0); }
				}
				.steam-wisp {
					animation: steam-rise 2s ease-in-out infinite;
				}
				.mascot-wave {
					animation: mascot-wave 2.6s ease-in-out infinite;
					transform-origin: 50% 72%;
				}
				@media (prefers-reduced-motion: reduce) {
					.steam-wisp { animation: none; }
					.mascot-wave { animation: none; }
				}
			`}</style>
		</div>
	);
}
