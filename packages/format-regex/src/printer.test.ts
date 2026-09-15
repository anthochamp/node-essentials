import { describe, expect, it } from "vitest";

import { parseRegex } from "./parser.js";
import { printRegex } from "./printer.js";

describe("printRegex", () => {
	const roundTrips = [
		"a",
		"ab",
		"a|b|c",
		"(a)(b)",
		"(?:ab)+",
		"a*",
		"a+",
		"a?",
		"a{2,5}",
		"a{2,}",
		"a{2}",
		"a*?",
		"a??",
		"[a-z0-9_]",
		"[^a-z]",
		"\\d\\w\\s",
		"^a$",
	];

	it.each(roundTrips)("round-trips %s", (source) => {
		expect(printRegex(parseRegex(source))).toBe(source);
	});

	it("escapes a literal metacharacter back out", () => {
		expect(printRegex(parseRegex("\\."))).toBe("\\.");
	});

	it("escapes ']' and '\\\\' inside a printed class", () => {
		expect(printRegex(parseRegex("[\\]\\\\]"))).toBe("[\\]\\\\]");
	});
});
