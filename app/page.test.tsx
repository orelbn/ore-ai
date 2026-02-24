import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Home from "./page";

test("homepage renders Hello Ore AI", () => {
	const html = renderToStaticMarkup(<Home />);
	expect(html).toContain("Hello Ore AI");
});
