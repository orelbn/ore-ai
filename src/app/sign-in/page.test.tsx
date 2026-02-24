import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import SignInPage from "./page";

describe("Sign-in page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toBeTruthy();
	});

	test("includes skip navigation and main target", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain('href="#main-content"');
		expect(html).toContain('id="main-content"');
	});

	test("contains primary sign-in action", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain('aria-label="Sign in with Google"');
		expect(html.match(/<button/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
	});

	test("links to legal documents", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain('href="/terms"');
		expect(html).toContain('href="/privacy"');
	});
});
