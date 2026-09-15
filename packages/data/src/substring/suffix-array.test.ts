import { expect, suite, test } from "vitest";

import { GeneralizedSuffixArray } from "./generalized-suffix-array.js";
import { SuffixArray } from "./suffix-array.js";

/** The answer a scan would give, to check the index against. */
const occurrencesOf = (text: string, needle: string): number[] => {
	const found: number[] = [];

	for (let index = text.indexOf(needle); index !== -1;) {
		found.push(index);
		index = text.indexOf(needle, index + 1);
	}

	return found;
};

suite("SuffixArray", () => {
	test("should find every occurrence, including overlapping ones", () => {
		const index = new SuffixArray("banana");

		expect(Array.from(index.search("ana"))).toEqual([1, 3]);
		expect(Array.from(index.search("na"))).toEqual([2, 4]);
		expect(Array.from(index.search("banana"))).toEqual([0]);
	});

	test("should report absence", () => {
		const index = new SuffixArray("banana");

		expect(Array.from(index.search("xyz"))).toEqual([]);
		expect(index.has("xyz")).toBe(false);
		expect(index.has("ana")).toBe(true);
		expect(index.countOf("xyz")).toBe(0);
		expect(index.countOf("a")).toBe(3);
	});

	test("should not match a needle longer than the text", () => {
		const index = new SuffixArray("ab");

		expect(index.has("abc")).toBe(false);
		expect(Array.from(index.search("abc"))).toEqual([]);
	});

	test("should treat the empty needle as matching everywhere", () => {
		const index = new SuffixArray("abc");

		expect(index.has("")).toBe(true);
		expect(Array.from(index.search(""))).toEqual([0, 1, 2]);
		expect(index.countOf("")).toBe(3);
	});

	test("should handle empty text", () => {
		const index = new SuffixArray("");

		expect(index.count()).toBe(0);
		expect(index.has("a")).toBe(false);
		expect(Array.from(index.search("a"))).toEqual([]);
		expect(Array.from(index.search(""))).toEqual([]);
	});

	test("should sort every suffix exactly once", () => {
		const text = "mississippi";
		const index = new SuffixArray(text);

		const order = index.order();

		expect(order).toHaveLength(text.length);
		expect(new Set(order).size).toBe(text.length);

		// The defining property: suffixes are in lexicographic order.
		const suffixes = order.map((offset) => text.slice(offset));
		expect(suffixes).toEqual(suffixes.toSorted());
	});

	test("should agree with a scan on every substring of a repetitive text", () => {
		const text = "abababaabbaaabbbabab";
		const index = new SuffixArray(text);

		for (let start = 0; start < text.length; start++) {
			for (let end = start + 1; end <= text.length; end++) {
				const needle = text.slice(start, end);

				expect(Array.from(index.search(needle))).toEqual(
					occurrencesOf(text, needle),
				);
			}
		}
	});

	test("should handle a text of one repeated character", () => {
		const index = new SuffixArray("aaaa");

		expect(Array.from(index.search("aa"))).toEqual([0, 1, 2]);
		expect(index.countOf("a")).toBe(4);
	});

	test("should index a long text without quadratic blow-up", () => {
		const text = "abcde".repeat(4000);
		const index = new SuffixArray(text);

		expect(index.count()).toBe(20_000);
		expect(index.countOf("eabc")).toBe(3999);
		expect(index.has("edcba")).toBe(false);
	});
});

suite("GeneralizedSuffixArray", () => {
	const corpus = (): GeneralizedSuffixArray =>
		new GeneralizedSuffixArray(["banana", "bandana", "orange"]);

	test("should report which documents contain a needle", () => {
		const index = corpus();

		expect(Array.from(index.search("ban"))).toEqual([0, 1]);
		expect(Array.from(index.search("ana"))).toEqual([0, 1]);
		expect(Array.from(index.search("range"))).toEqual([2]);
		expect(Array.from(index.search("xyz"))).toEqual([]);
	});

	test("should deduplicate a document matching several times", () => {
		const index = new GeneralizedSuffixArray(["aaaa"]);

		expect(Array.from(index.search("a"))).toEqual([0]);
	});

	test("should give offsets relative to each document", () => {
		const index = corpus();

		const matches = Array.from(index.matches("ana")).sort(
			(left, right) =>
				left.document - right.document || left.offset - right.offset,
		);

		expect(matches).toEqual([
			{ document: 0, offset: 1 },
			{ document: 0, offset: 3 },
			{ document: 1, offset: 4 },
		]);
	});

	test("should never match across a document boundary", () => {
		const index = new GeneralizedSuffixArray(["abc", "def"]);

		expect(index.has("cdef")).toBe(false);
		expect(index.has("cd")).toBe(false);
		expect(Array.from(index.search("c"))).toEqual([0]);
		expect(Array.from(index.search("d"))).toEqual([1]);
	});

	test("should reject a document holding the reserved separator", () => {
		expect(() => new GeneralizedSuffixArray(["ok", "bad\u0000"])).toThrow(
			RangeError,
		);
	});

	test("should handle an empty corpus and empty documents", () => {
		const empty = new GeneralizedSuffixArray([]);

		expect(empty.count()).toBe(0);
		expect(empty.has("a")).toBe(false);
		expect(Array.from(empty.search("a"))).toEqual([]);
		expect(Array.from(empty.search(""))).toEqual([]);

		const withEmpty = new GeneralizedSuffixArray(["", "a"]);

		expect(Array.from(withEmpty.search("a"))).toEqual([1]);
	});

	test("should treat the empty needle as matching every document", () => {
		const index = corpus();

		expect(Array.from(index.search(""))).toEqual([0, 1, 2]);
		expect(index.has("")).toBe(true);
		expect(Array.from(index.matches(""))).toEqual([]);
	});
});
