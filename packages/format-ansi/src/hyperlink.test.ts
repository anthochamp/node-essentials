import { expect, suite, test } from "vitest";

import { hyperlink } from "./hyperlink.js";

suite("hyperlink", () => {
	test("wraps text in an OSC 8 escape sequence", () => {
		expect(hyperlink("https://example.com", "link text")).toBe(
			"\u001B]8;;https://example.com\u0007link text\u001B]8;;\u0007",
		);
	});
});
