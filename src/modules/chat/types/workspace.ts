import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";

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
