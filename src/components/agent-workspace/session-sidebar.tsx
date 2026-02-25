"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import type { AgentSessionSummary } from "./workspace-types";
import { formatUpdatedAt } from "./workspace-utils";
import { CloseIcon, NewSessionIcon } from "./workspace-icons";

type SessionSidebarProps = {
	sessions: AgentSessionSummary[];
	selectedSessionId: string | null;
	isLoading: boolean;
	isOpen: boolean;
	onClose: () => void;
	onCreateSession: () => void;
	onSelectSession: (sessionId: string) => void;
	onDeleteSession: (session: AgentSessionSummary) => void;
};

export function SessionSidebar({
	sessions,
	selectedSessionId,
	isLoading,
	isOpen,
	onClose,
	onCreateSession,
	onSelectSession,
	onDeleteSession,
}: SessionSidebarProps) {
	return (
		<>
			<button
				type="button"
				aria-label="Close session menu"
				onClick={onClose}
				className={cn(
					"fixed inset-0 z-30 bg-foreground/20 transition-opacity",
					isOpen ? "opacity-100" : "pointer-events-none opacity-0",
				)}
			/>

			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-40 w-[292px] border-r border-border bg-card text-card-foreground shadow-xl transition-transform",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<div className="flex h-full flex-col">
					<div className="border-b border-border px-4 py-4">
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold text-card-foreground">
								OreAI Sessions
							</p>
							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									title="New session"
									aria-label="New session"
									className="text-muted-foreground hover:text-foreground"
									onClick={onCreateSession}
								>
									<NewSessionIcon className="size-6" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									title="Toggle sidebar"
									aria-label="Toggle sidebar"
									className="text-muted-foreground hover:text-foreground"
									onClick={onClose}
								>
									<CloseIcon className="size-6" />
								</Button>
							</div>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-2">
						{isLoading ? (
							<p className="px-3 py-4 text-sm text-muted-foreground">
								Loading sessions...
							</p>
						) : sessions.length === 0 ? (
							<p className="px-3 py-4 text-sm text-muted-foreground">
								No saved sessions yet.
							</p>
						) : (
							<ul className="space-y-1">
								{sessions.map((session) => (
									<li key={session.id} className="group">
										<div
											className={cn(
												"flex min-w-0 items-center gap-1 px-2 py-1 transition-colors",
												selectedSessionId === session.id
													? "bg-muted"
													: "bg-transparent hover:bg-muted/60",
											)}
										>
											<button
												type="button"
												onClick={() => onSelectSession(session.id)}
												className="min-w-0 flex-1 px-1 py-1 text-left"
											>
												<p className="truncate text-sm font-medium text-foreground">
													{session.title}
												</p>
												<p className="mt-1 text-[11px] text-muted-foreground">
													{formatUpdatedAt(session.updatedAt)}
												</p>
											</button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												title="Delete session"
												onClick={() => onDeleteSession(session)}
												className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
												aria-label={`Delete ${session.title} session`}
											>
												<HugeiconsIcon icon={Delete02Icon} size={20} />
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</aside>
		</>
	);
}
