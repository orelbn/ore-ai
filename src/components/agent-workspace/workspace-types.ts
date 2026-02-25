import type { OreAgentUIMessage } from "@/lib/agents/ore-agent";

export type AgentSessionSummary = {
	id: string;
	title: string;
	updatedAt: number;
	lastMessagePreview: string;
};

export type AgentSessionDetail = {
	id: string;
	title: string;
	messages: OreAgentUIMessage[];
};
