export type ConversationMessage = {
	id: string;
	role: "user" | "assistant";
	parts: Array<{
		type: "text";
		text: string;
	}>;
};

export type ConversationRecord = {
	conversationId: string;
	messages: ConversationMessage[];
};
