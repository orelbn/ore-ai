"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ore-ai-theme";
const ThemeContext = createContext<{
	theme: Theme;
	setTheme: (theme: Theme) => void;
} | null>(null);

function applyTheme(theme: Theme) {
	const prefersDark =
		theme === "system" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches;
	const isDark = theme === "dark" || prefersDark;

	document.documentElement.classList.toggle("dark", isDark);
}

function getInitialTheme(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}

	return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>("system");

	useEffect(() => {
		const initialTheme = getInitialTheme();
		setThemeState(initialTheme);
		applyTheme(initialTheme);
	}, []);

	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => applyTheme("system");
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	const value = useMemo(
		() => ({
			theme,
			setTheme: (nextTheme: Theme) => {
				setThemeState(nextTheme);
				localStorage.setItem(STORAGE_KEY, nextTheme);
				applyTheme(nextTheme);
			},
		}),
		[theme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}

	return context;
}
