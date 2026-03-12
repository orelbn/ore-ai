"use client";

import { UserMenu } from "./user-menu";
import { NewSessionIcon } from "./workspace-icons";

type WorkspaceHeaderProps = {
	onToggleSidebar: () => void;
	onCreateSession: () => void;
};

export function WorkspaceHeader({
	onToggleSidebar,
	onCreateSession,
}: WorkspaceHeaderProps) {
	return (
		<header className="flex items-center justify-between px-4 py-3 sm:px-6">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleSidebar}
					title="Toggle sessions"
					className="rounded-md p-2 text-2xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Toggle session menu"
				>
					☰
				</button>
				<button
					type="button"
					onClick={onCreateSession}
					title="New session"
					aria-label="New session"
					className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<NewSessionIcon className="size-6" />
				</button>
			</div>
			<div className="flex items-center gap-4">
				<div className="flex items-center text-foreground">
					<img
						src="/ore-ai.webp"
						alt=""
						width={28}
						height={28}
						className="rounded-full"
						loading="eager"
						decoding="async"
					/>
					<span className="text-base font-semibold tracking-tight">Ore AI</span>
				</div>
				<UserMenu />
			</div>
		</header>
	);
}
