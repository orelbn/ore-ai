import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage from "./page";

describe("Privacy page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html).toBeTruthy();
	});

	test("has title", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html).toContain("Privacy Policy");
	});

	test("renders all sections", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html).toContain('aria-labelledby="section-short"');
		expect(html).toContain('aria-labelledby="section-collect"');
		expect(html).toContain('aria-labelledby="section-why"');
		expect(html).toContain('aria-labelledby="section-sharing"');
		expect(html).toContain('aria-labelledby="section-retention"');
		expect(html).toContain('aria-labelledby="section-contact"');
	});

	test("has google privacy link", () => {
		const html = renderToStaticMarkup(<PrivacyPage />);
		expect(html).toContain("policies.google.com/privacy");
	});
});
