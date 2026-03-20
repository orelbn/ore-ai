"use client";

import { NewSessionIcon } from "./workspace-icons";

type WorkspaceHeaderProps = {
	onResetConversation: () => void;
};

export function WorkspaceHeader({ onResetConversation }: WorkspaceHeaderProps) {
	return (
		<header className="flex items-center justify-between px-4 py-3 sm:px-6">
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
			<button
				type="button"
				onClick={onResetConversation}
				title="New chat"
				aria-label="New chat"
				className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<NewSessionIcon className="size-6" />
			</button>
		</header>
	);
}
