import { describe, expect, test } from "bun:test";
import { cn } from "./utils";

describe("cn", () => {
	test("joins class values and omits falsy entries", () => {
		expect(cn("p-2", false && "hidden", undefined, "text-sm")).toBe(
			"p-2 text-sm",
		);
	});

	test("resolves conflicting Tailwind classes by keeping the latest", () => {
		expect(cn("px-2", "px-4", "text-sm", "text-lg")).toBe("px-4 text-lg");
	});
});
