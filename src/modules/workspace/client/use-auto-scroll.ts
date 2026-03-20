"use client";

import { useEffect, useRef } from "react";

export function useAutoScroll(messageCount: number) {
	const bottomAnchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void messageCount;
		bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messageCount]);

	return bottomAnchorRef;
}
