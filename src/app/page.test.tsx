import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Home from "./page";

describe("Home page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<Home />);
		expect(html).toBeTruthy();
	});

	test("has correct heading", () => {
		const html = renderToStaticMarkup(<Home />);
		expect(html).toContain("Coming soon");
	});

	test("has coffee tagline", () => {
		const html = renderToStaticMarkup(<Home />);
		expect(html).toContain("coffee");
	});
});
