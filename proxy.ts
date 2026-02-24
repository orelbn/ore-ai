import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	console.log("Run:", sessionCookie); // Debugging line
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: [
		{
			source:
				"/((?!sign-in|api/auth|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
		},
	],
};
