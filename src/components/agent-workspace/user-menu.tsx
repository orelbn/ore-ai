"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function UserMenu() {
	const navigate = useNavigate();
	const { data: session } = useSession();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const displayName = session?.user?.name?.trim();
	const imageUrl = session?.user?.image?.trim() || "";
	const firstName = displayName?.split(/\s+/)[0] ?? "";
	const initial = firstName.charAt(0).toUpperCase() || "U";

	async function handleSignOut() {
		if (isSigningOut) return;

		setIsSigningOut(true);
		setError(null);

		try {
			await signOut({
				fetchOptions: {
					onSuccess: () => {
						void navigate({ to: "/sign-in", replace: true });
					},
				},
			});
		} catch {
			setError("Failed to sign out. Please try again.");
			setIsSigningOut(false);
			setIsMenuOpen(true);
		}
	}

	return (
		<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
			<DropdownMenuTrigger
				aria-label="Open user menu"
				className="rounded-md p-1"
			>
				<Avatar size="sm">
					{imageUrl ? (
						<AvatarImage src={imageUrl} alt={displayName ?? "User"} />
					) : null}
					<AvatarFallback>{initial}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuItem
					onClick={() => void handleSignOut()}
					disabled={isSigningOut}
				>
					{isSigningOut ? "Signing out..." : "Sign out"}
				</DropdownMenuItem>
				{error ? (
					<p className="px-2 text-xs text-destructive">{error}</p>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
