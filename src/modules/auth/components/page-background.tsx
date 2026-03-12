export function PageBackground() {
	return (
		<div aria-hidden="true" className="pointer-events-none">
			{/* Grain texture */}
			<div className="page-background-noise fixed inset-0 z-0 opacity-[0.04]" />
			{/* Top-left blue glow */}
			<div className="page-background-glow page-background-glow-top-left fixed -left-48 -top-48 z-0 rounded-full" />
			{/* Bottom-right blue glow */}
			<div className="page-background-glow page-background-glow-bottom-right fixed -bottom-48 -right-48 z-0 rounded-full" />
		</div>
	);
}
