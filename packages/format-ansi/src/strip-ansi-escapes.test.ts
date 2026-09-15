import { expect, suite, test } from "vitest";

import { stripAnsiEscapes } from "./strip-ansi-escapes.js";

suite("stripAnsiEscapes", () => {
	test("returns plain text unchanged", () => {
		expect(stripAnsiEscapes("hello world")).toBe("hello world");
	});

	test("strips an SGR color sequence", () => {
		expect(stripAnsiEscapes("\u001B[31mred\u001B[0m")).toBe("red");
	});

	test("strips a cursor movement sequence", () => {
		expect(stripAnsiEscapes("a\u001B[2Ab")).toBe("ab");
	});

	test("strips an OSC 8 hyperlink, keeping the link text", () => {
		const withLink =
			"\u001B]8;;https://example.com\u0007link text\u001B]8;;\u0007";
		expect(stripAnsiEscapes(withLink)).toBe("link text");
	});
});
