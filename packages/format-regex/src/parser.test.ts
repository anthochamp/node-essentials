import { describe, expect, it } from "vitest";

import { parseRegex, RegexParseError } from "./parser.js";

describe("parseRegex", () => {
	it("parses a single literal", () => {
		const pattern = parseRegex("a");
		expect(pattern.body).toMatchObject({ kind: "literal", char: "a" });
		expect(pattern.groupCount).toBe(0);
	});

	it("parses concatenation", () => {
		const pattern = parseRegex("ab");
		expect(pattern.body.kind).toBe("concat");
		if (pattern.body.kind === "concat") {
			expect(pattern.body.items).toMatchObject([
				{ kind: "literal", char: "a" },
				{ kind: "literal", char: "b" },
			]);
		}
	});

	it("parses alternation", () => {
		const pattern = parseRegex("a|b|c");
		expect(pattern.body.kind).toBe("alternation");
		if (pattern.body.kind === "alternation") {
			expect(pattern.body.alternatives).toMatchObject([
				{ kind: "literal", char: "a" },
				{ kind: "literal", char: "b" },
				{ kind: "literal", char: "c" },
			]);
		}
	});

	it("numbers capturing groups in left-to-right open-paren order", () => {
		const pattern = parseRegex("(a(b)(c))");
		expect(pattern.groupCount).toBe(3);
		expect(pattern.body).toMatchObject({
			kind: "group",
			capturing: true,
			index: 1,
		});
	});

	it("does not number non-capturing groups", () => {
		const pattern = parseRegex("(?:ab)(c)");
		expect(pattern.groupCount).toBe(1);
	});

	it("parses quantifiers", () => {
		expect(parseRegex("a*").body).toMatchObject({
			kind: "quantified",
			min: 0,
			max: undefined,
			lazy: false,
		});
		expect(parseRegex("a+").body).toMatchObject({
			kind: "quantified",
			min: 1,
			max: undefined,
			lazy: false,
		});
		expect(parseRegex("a?").body).toMatchObject({
			kind: "quantified",
			min: 0,
			max: 1,
			lazy: false,
		});
		expect(parseRegex("a{2,5}").body).toMatchObject({
			kind: "quantified",
			min: 2,
			max: 5,
			lazy: false,
		});
		expect(parseRegex("a{2,}").body).toMatchObject({
			kind: "quantified",
			min: 2,
			max: undefined,
			lazy: false,
		});
		expect(parseRegex("a{2}").body).toMatchObject({
			kind: "quantified",
			min: 2,
			max: 2,
			lazy: false,
		});
	});

	it("parses lazy quantifiers", () => {
		expect(parseRegex("a*?").body).toMatchObject({
			kind: "quantified",
			min: 0,
			max: undefined,
			lazy: true,
		});
		expect(parseRegex("a??").body).toMatchObject({
			kind: "quantified",
			min: 0,
			max: 1,
			lazy: true,
		});
	});

	it("parses a character class with a range and a shorthand", () => {
		const pattern = parseRegex("[a-z\\d_]");
		expect(pattern.body).toMatchObject({
			kind: "charClass",
			negated: false,
			items: [
				{ kind: "range", from: "a", to: "z" },
				{ kind: "shorthand", value: "d" },
				{ kind: "char", char: "_" },
			],
		});
	});

	it("parses a negated character class", () => {
		const pattern = parseRegex("[^abc]");
		expect(pattern.body).toMatchObject({ kind: "charClass", negated: true });
	});

	it("treats a trailing hyphen in a class as literal", () => {
		const pattern = parseRegex("[a-]");
		expect(pattern.body).toMatchObject({
			kind: "charClass",
			items: [
				{ kind: "char", char: "a" },
				{ kind: "char", char: "-" },
			],
		});
	});

	it("parses anchors", () => {
		const pattern = parseRegex("^a$");
		expect(pattern.body.kind).toBe("concat");
	});

	it("throws RegexParseError on a quantifier with max < min", () => {
		expect(() => parseRegex("a{5,2}")).toThrow(RegexParseError);
	});

	it("throws RegexParseError on an unmatched paren", () => {
		expect(() => parseRegex("(a")).toThrow(RegexParseError);
	});

	it("throws RegexParseError on an empty character class", () => {
		expect(() => parseRegex("[]")).toThrow(RegexParseError);
	});

	it("throws RegexParseError on trailing input", () => {
		expect(() => parseRegex("a)")).toThrow(RegexParseError);
	});
});
