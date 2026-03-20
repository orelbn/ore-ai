"use client";

import type { RefObject } from "react";
import {
	extractPlainTextFromParts,
	type ConversationMessage,
} from "@/modules/chat";

type ConversationMessageListProps = {
	messages: ConversationMessage[];
	status: string;
	bottomAnchorRef: RefObject<HTMLDivElement | null>;
};

export function ConversationMessageList({
	messages,
	status,
	bottomAnchorRef,
}: ConversationMessageListProps) {
	return (
		<div className="scrollbar-transparent flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
			<div className="mx-auto w-full max-w-3xl space-y-4 pt-8">
				{messages.map((message) => {
					const text = extractPlainTextFromParts(message.parts);
					if (message.role === "user") {
						return (
							<div
								key={message.id}
								className="ml-auto w-fit max-w-[78%] rounded-xl border border-primary/20 bg-primary px-3 py-2 text-sm leading-5 whitespace-pre-wrap text-primary-foreground"
							>
								{text || "(No text content)"}
							</div>
						);
					}

					return (
						<div
							key={message.id}
							className="max-w-[92%] px-1 py-1 text-sm leading-7 whitespace-pre-wrap text-foreground"
						>
							{text || "(No text content)"}
						</div>
					);
				})}

				{status === "streaming" ? (
					<p className="text-xs text-muted-foreground">OreAI is thinking...</p>
				) : null}
				<div ref={bottomAnchorRef} />
			</div>
		</div>
	);
}
