import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import TermsPage from "./page";

describe("Terms page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html).toBeTruthy();
	});

	test("renders a legal document structure", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html.match(/<main/g)?.length ?? 0).toBe(1);
		expect(html.match(/<section/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
		expect(html.match(/<h2/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
	});

	test("has back link to sign-in", () => {
		const html = renderToStaticMarkup(<TermsPage />);
		expect(html).toContain('href="/sign-in"');
	});
});
