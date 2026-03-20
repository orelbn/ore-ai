import type { OreAgentUIMessage } from "@/services/google-ai/ore-agent";

export type ConversationMessage = OreAgentUIMessage;

export type ConversationRecord = {
	conversationId: string;
	messages: ConversationMessage[];
};
