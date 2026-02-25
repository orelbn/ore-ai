import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: [
		{
			source:
				"/((?!api|sign-in|terms|privacy|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
		},
	],
};
