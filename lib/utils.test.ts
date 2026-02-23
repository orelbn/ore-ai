import { expect, test } from "bun:test";

import { cn } from "./utils";

test("cn merges class names", () => {
  expect(cn("p-2", "text-sm")).toBe("p-2 text-sm");
});