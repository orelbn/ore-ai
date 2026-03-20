"use client";

import { useState } from "react";
import { authClient } from "@/services/auth/client";

type ConversationSubmissionInput = {
	canSubmit: boolean;
	clearError: () => void;
	handleRejected: () => void;
	hasSession: boolean;
	markVerified: () => void;
	sendMessage: (message: { text: string }) => Promise<void>;
	status: string;
	token: string | null;
};

export function useConversationSubmission({
	canSubmit,
	clearError,
	handleRejected,
	hasSession,
	markVerified,
	sendMessage,
	status,
	token,
}: ConversationSubmissionInput) {
	const [input, setInput] = useState("");

	async function sendPrompt(promptText: string) {
		setInput("");
		clearError();

		if (!hasSession) {
			try {
				await authClient.signIn.anonymous({
					fetchOptions: {
						headers: {
							"x-captcha-response": token ?? "",
						},
					},
				});
				markVerified();
			} catch {
				handleRejected();
				return;
			}
		}

		await sendMessage({ text: promptText });
	}

	async function handleSubmit() {
		const trimmedInput = input.trim();
		if (
			!trimmedInput ||
			status === "submitted" ||
			status === "streaming" ||
			!canSubmit
		) {
			return;
		}

		await sendPrompt(trimmedInput);
	}

	return {
		handleSubmit,
		input,
		setInput,
	};
}
