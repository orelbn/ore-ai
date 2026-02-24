import { expect, test, describe } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Home from "./page";

describe("Home page", () => {
	test("renders without crash", () => {
		const html = renderToStaticMarkup(<Home />);
		expect(html).toBeTruthy();
	});

	test("renders semantic page structure", () => {
		const html = renderToStaticMarkup(<Home />);
		expect(html.match(/<main/g)?.length ?? 0).toBe(1);
		expect(html.match(/<h1/g)?.length ?? 0).toBe(1);
	});

	test("renders an image in the main content", () => {
		const html = renderToStaticMarkup(<Home />);
		expect(html.match(/<img/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
	});
});
