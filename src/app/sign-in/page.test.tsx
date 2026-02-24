import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import SignInPage from "./page";

describe("Sign-in page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toBeTruthy();
	});

	test("has skip link", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain("Skip to main content");
	});

	test("has main content id", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain('id="main-content"');
	});

	test("has footer version", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain("v0");
	});

	test("renders about section", () => {
		const html = renderToStaticMarkup(<SignInPage />);
		expect(html).toContain("Ever wanted to know more about Orel");
	});
});
