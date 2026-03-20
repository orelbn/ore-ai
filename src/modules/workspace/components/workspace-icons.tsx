type IconProps = {
	className?: string;
};

export function CloseIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.9"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m7 7 10 10" />
			<path d="m17 7-10 10" />
		</svg>
	);
}

export function NewSessionIcon({ className }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 4.25H7.75a3.5 3.5 0 0 0-3.5 3.5v8.5a3.5 3.5 0 0 0 3.5 3.5h8.5a3.5 3.5 0 0 0 3.5-3.5V12" />
			<g transform="rotate(45 15.5 8.5)">
				<rect x="14" y="4.25" width="3" height="7.6" rx="1" />
				<path d="M14 11.85h3L15.5 14Z" />
				<line x1="14" y1="6.7" x2="17" y2="6.7" />
			</g>
		</svg>
	);
}
