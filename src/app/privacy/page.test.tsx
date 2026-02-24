import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage from "./page";

describe("Privacy page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html).toBeTruthy();
	});

	test("renders a legal document structure", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html.match(/<main/g)?.length ?? 0).toBe(1);
		expect(html.match(/<section/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
		expect(html.match(/<h2/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
	});

	test("has required external and internal navigation", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html).toContain("policies.google.com/privacy");
		expect(html).toContain('href="/sign-in"');
	});
});
