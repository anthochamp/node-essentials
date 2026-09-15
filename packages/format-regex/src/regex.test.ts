import { describe, expect, it } from "vitest";

import { compileRegex } from "./regex.js";

describe("compileRegex", () => {
	it("matches a literal substring anywhere in the input", () => {
		const re = compileRegex("cd");
		expect(re.test("abcdef")).toBe(true);
		const match = re.exec("abcdef");
		expect(match).toMatchObject({ index: 2, length: 2, text: "cd" });
	});

	it("returns undefined when there is no match", () => {
		expect(compileRegex("xyz").exec("abcdef")).toBeUndefined();
	});

	it("finds the leftmost match", () => {
		const match = compileRegex("a").exec("banana");
		expect(match).toMatchObject({ index: 1 });
	});

	it("matches alternation", () => {
		const re = compileRegex("cat|dog");
		expect(re.test("I have a dog")).toBe(true);
		expect(re.test("I have a fish")).toBe(false);
	});

	it("greedy '*' consumes as much as possible", () => {
		const match = compileRegex("a*").exec("aaab");
		expect(match).toMatchObject({ index: 0, length: 3, text: "aaa" });
	});

	it("lazy '*?' consumes as little as possible", () => {
		const match = compileRegex("a*?b").exec("aaab");
		expect(match).toMatchObject({ index: 0, length: 4, text: "aaab" });
	});

	it("greedy vs. lazy differ on which substring wins inside a larger match", () => {
		expect(compileRegex("<.+>").exec("<a><b>")).toMatchObject({
			text: "<a><b>",
		});
		expect(compileRegex("<.+?>").exec("<a><b>")).toMatchObject({ text: "<a>" });
	});

	it("matches bounded repetition {m,n}", () => {
		const re = compileRegex("a{2,3}");
		expect(re.exec("a")).toBeUndefined();
		expect(re.exec("aa")).toMatchObject({ text: "aa" });
		expect(re.exec("aaaa")).toMatchObject({ text: "aaa" });
	});

	it("matches a character class and its negation", () => {
		expect(compileRegex("[aeiou]+").exec("xyz aeiou")).toMatchObject({
			text: "aeiou",
		});
		expect(compileRegex("[^aeiou ]+").exec("xyz aeiou")).toMatchObject({
			text: "xyz",
		});
	});

	it("matches shorthand classes", () => {
		const match = compileRegex("\\d+-\\d+").exec("pages 10-20 done");
		expect(match).toMatchObject({ text: "10-20" });
	});

	it("captures groups in order", () => {
		const match = compileRegex("(\\d+)-(\\d+)").exec("10-20");
		expect(match?.groups[1]).toMatchObject({ text: "10" });
		expect(match?.groups[2]).toMatchObject({ text: "20" });
	});

	it("leaves a non-participating group undefined", () => {
		const match = compileRegex("(a)|(b)").exec("b");
		expect(match?.groups[1]).toBeUndefined();
		expect(match?.groups[2]).toMatchObject({ text: "b" });
	});

	it("does not number a non-capturing group's contents", () => {
		const match = compileRegex("(?:a)(b)").exec("ab");
		expect(match?.groups).toHaveLength(2); // overall + group 1 only
		expect(match?.groups[1]).toMatchObject({ text: "b" });
	});

	it("respects '^' and '$' anchors", () => {
		expect(compileRegex("^abc$").test("abc")).toBe(true);
		expect(compileRegex("^abc$").test("xabc")).toBe(false);
		expect(compileRegex("^abc$").test("abcx")).toBe(false);
	});

	it("does not exhibit catastrophic backtracking on a classic ReDoS pattern", () => {
		// A backtracking engine is exponential here; the Pike VM is linear in
		// program size × input length regardless of pattern shape.
		const re = compileRegex("(a+)+b");
		const input = `${"a".repeat(50)}c`;
		expect(re.test(input)).toBe(false);
	});
});
