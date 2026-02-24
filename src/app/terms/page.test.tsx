import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import TermsPage from "./page";

describe("Terms page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html).toBeTruthy();
	});

	test("has title", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html).toContain("Terms of Use");
	});

	test("renders all sections", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html).toContain('aria-labelledby="section-reality"');
		expect(html).toContain('aria-labelledby="section-allowed"');
		expect(html).toContain('aria-labelledby="section-not-allowed"');
		expect(html).toContain('aria-labelledby="section-liability"');
		expect(html).toContain('aria-labelledby="section-availability"');
		expect(html).toContain('aria-labelledby="section-changes"');
		expect(html).toContain('aria-labelledby="section-final"');
	});

	test("has back link to sign-in", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html).toContain('href="/sign-in"');
	});
});
