"use client";

import { useCallback, useState } from "react";

export function useWorkspaceSidebarState() {
	const [isOpen, setIsOpen] = useState(false);

	const close = useCallback(() => {
		setIsOpen(false);
	}, []);

	const toggle = useCallback(() => {
		setIsOpen((open) => !open);
	}, []);

	return {
		isOpen,
		close,
		toggle,
	};
}
