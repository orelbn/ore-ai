"use client";

import { cn } from "@/lib/utils";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "../ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "../ui/sidebar";
import { CloseIcon, NewSessionIcon } from "./workspace-icons";
import type { AgentSessionSummary } from "./workspace-types";
import { formatUpdatedAt } from "./workspace-utils";

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

type SessionListContentProps = {
	sessions: AgentSessionSummary[];
	selectedSessionId: string | null;
	isLoading: boolean;
	onSelectSession: (sessionId: string) => void;
	onDeleteSession: (session: AgentSessionSummary) => void;
};

type SessionSidebarHeaderProps = {
	onCreateSession: () => void;
	onClose: () => void;
};

function SessionSidebarHeader({
	onCreateSession,
	onClose,
}: SessionSidebarHeaderProps) {
	return (
		<SidebarHeader className="border-b border-border px-4 py-4">
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
		</SidebarHeader>
	);
}

function SessionListContent({
	sessions,
	selectedSessionId,
	isLoading,
	onSelectSession,
	onDeleteSession,
}: SessionListContentProps) {
	if (isLoading) {
		return (
			<p className="px-3 py-4 text-sm text-muted-foreground">
				Loading sessions...
			</p>
		);
	}

	if (sessions.length === 0) {
		return (
			<p className="px-3 py-4 text-sm text-muted-foreground">
				No saved sessions yet.
			</p>
		);
	}

	return (
		<SidebarMenu className="gap-1">
			{sessions.map((session) => (
				<SidebarMenuItem key={session.id}>
					<SidebarMenuButton
						onClick={() => onSelectSession(session.id)}
						isActive={selectedSessionId === session.id}
						className="h-auto items-start pr-8"
					>
						<span className="flex min-w-0 flex-1 flex-col text-left">
							<span className="truncate text-sm font-medium text-foreground">
								{session.title}
							</span>
							<span className="mt-1 text-[11px] text-muted-foreground">
								{formatUpdatedAt(session.updatedAt)}
							</span>
						</span>
					</SidebarMenuButton>
					<SidebarMenuAction
						showOnHover
						title="Delete session"
						onClick={() => onDeleteSession(session)}
						aria-label={`Delete ${session.title} session`}
					>
						<HugeiconsIcon icon={Delete02Icon} size={18} />
					</SidebarMenuAction>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
}

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
		<SidebarProvider className="contents">
			<Sidebar
				collapsible="none"
				className={cn(
					"fixed inset-y-0 left-0 z-40 w-73 border-r border-border bg-card text-card-foreground shadow-xl transition-transform",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<SessionSidebarHeader
					onCreateSession={onCreateSession}
					onClose={onClose}
				/>

				<SidebarContent className="p-2">
					<SessionListContent
						sessions={sessions}
						selectedSessionId={selectedSessionId}
						isLoading={isLoading}
						onSelectSession={onSelectSession}
						onDeleteSession={onDeleteSession}
					/>
				</SidebarContent>
			</Sidebar>
		</SidebarProvider>
	);
}
