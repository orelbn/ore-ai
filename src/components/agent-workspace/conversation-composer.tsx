"use client";

import { useEffect, useRef } from "react";
import { Button } from "../ui/button";

type ConversationComposerProps = {
	input: string;
	onInputChange: (value: string) => void;
	onSubmit: () => Promise<void>;
	status: string;
	onStop: () => void;
	showQuickPrompts: boolean;
	quickPrompts: string[];
	placeholder: string;
};

export function ConversationComposer({
	input,
	onInputChange,
	onSubmit,
	status,
	onStop,
	showQuickPrompts,
	quickPrompts,
	placeholder,
}: ConversationComposerProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		void input;
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		const MAX_TEXTAREA_HEIGHT = 220;
		textarea.style.height = "0px";
		const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
		textarea.style.height = `${nextHeight}px`;
		textarea.style.overflowY =
			textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
	}, [input]);

	return (
		<>
			{showQuickPrompts ? (
				<div className="mb-3 grid gap-2 sm:grid-cols-2">
					{quickPrompts.map((prompt) => (
						<button
							key={prompt}
							type="button"
							onClick={() => {
								onInputChange(prompt);
								requestAnimationFrame(() => {
									textareaRef.current?.focus();
								});
							}}
							className="rounded-2xl border border-border bg-card px-3 py-3 text-left text-sm text-card-foreground transition-colors hover:bg-muted"
						>
							{prompt}
						</button>
					))}
				</div>
			) : null}

			<form
				onSubmit={async (event) => {
					event.preventDefault();
					await onSubmit();
				}}
				className="rounded-2xl bg-card px-3 py-2 shadow-sm"
			>
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(event) => onInputChange(event.target.value)}
					onKeyDown={async (event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							await onSubmit();
						}
					}}
					placeholder={placeholder}
					rows={2}
					maxLength={2000}
					className="scrollbar-transparent min-h-[64px] max-h-[220px] w-full resize-none bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
				/>
				<div className="flex items-center justify-end pt-2">
					<Button
						type={status === "streaming" ? "button" : "submit"}
						size="icon"
						title={status === "streaming" ? "Stop response" : "Send message"}
						aria-label={
							status === "streaming" ? "Stop response" : "Send message"
						}
						onClick={status === "streaming" ? onStop : undefined}
						className="size-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
						disabled={
							status !== "streaming" &&
							(status === "submitted" || !input.trim())
						}
					>
						{status === "streaming" ? (
							<span className="text-sm leading-none">■</span>
						) : (
							<span className="text-lg leading-none">↑</span>
						)}
					</Button>
				</div>
			</form>
		</>
	);
}
