import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ConversationEmptyState } from "./conversation-empty-state";

describe("ConversationEmptyState", () => {
	test("renders the greeting hero", () => {
		const html = renderToStaticMarkup(<ConversationEmptyState />);

		expect(html).toContain("Hi");
		expect(html).toContain("ore-ai.webp");
	});
});
