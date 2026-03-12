"use client";

type WorkspacePageErrorProps = {
	message: string | null;
};

export function WorkspacePageError({ message }: WorkspacePageErrorProps) {
	if (!message) {
		return null;
	}

	return (
		<div className="mx-auto mb-2 w-full max-w-3xl px-4 sm:px-6">
			<div
				className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
				role="alert"
			>
				{message}
			</div>
		</div>
	);
}
