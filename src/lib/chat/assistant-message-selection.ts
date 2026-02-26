import type { UIMessage } from "ai";

function getLastIndexById(messages: UIMessage[], id: string): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.id === id) return index;
	}
	return -1;
}

function getLastUserIndex(messages: UIMessage[]): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.role === "user") return index;
	}
	return -1;
}

export function selectAssistantMessagesForCurrentTurn(input: {
	allMessages: UIMessage[];
	requestMessageId: string;
	knownMessageIds: Set<string>;
}): UIMessage[] {
	const requestIndex = getLastIndexById(
		input.allMessages,
		input.requestMessageId,
	);
	const lastUserIndex = getLastUserIndex(input.allMessages);
	const startIndex = requestIndex >= 0 ? requestIndex : lastUserIndex;
	const candidateSlice =
		startIndex >= 0
			? input.allMessages.slice(startIndex + 1)
			: input.allMessages;

	const selected: UIMessage[] = [];
	const seenIds = new Set<string>();
	for (const candidate of candidateSlice) {
		if (candidate.role !== "assistant") continue;
		if (!Array.isArray(candidate.parts) || candidate.parts.length === 0)
			continue;
		if (input.knownMessageIds.has(candidate.id) || seenIds.has(candidate.id))
			continue;
		seenIds.add(candidate.id);
		selected.push(candidate);
	}

	return selected;
}
