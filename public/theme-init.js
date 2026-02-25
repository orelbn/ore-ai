(() => {
	try {
		const theme = localStorage.getItem("ore-ai-theme") || "system";
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		const isDark = theme === "dark" || (theme === "system" && prefersDark);

		document.documentElement.classList.toggle("dark", isDark);
	} catch {
		// Keep default light theme if storage or media query access fails.
	}
})();
