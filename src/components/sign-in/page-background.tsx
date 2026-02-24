export function PageBackground() {
	return (
		<div aria-hidden="true" className="pointer-events-none">
			{/* Grain texture */}
			<div
				className="fixed inset-0 z-0 opacity-[0.04]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
					backgroundRepeat: "repeat",
					backgroundSize: "128px 128px",
				}}
			/>
			{/* Top-left blue glow */}
			<div
				className="fixed -left-48 -top-48 z-0 rounded-full"
				style={{
					width: "700px",
					height: "700px",
					background:
						"radial-gradient(circle, oklch(0.42 0.18 266 / 0.3) 0%, transparent 70%)",
					filter: "blur(48px)",
				}}
			/>
			{/* Bottom-right blue glow */}
			<div
				className="fixed -bottom-48 -right-48 z-0 rounded-full"
				style={{
					width: "600px",
					height: "600px",
					background:
						"radial-gradient(circle, oklch(0.623 0.214 259.815 / 0.18) 0%, transparent 70%)",
					filter: "blur(64px)",
				}}
			/>
		</div>
	);
}
