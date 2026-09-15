import { expect, suite, test } from "vitest";

import { InvertedIndex } from "./inverted-index.js";

const index = (): InvertedIndex<string, number> => {
	const built = new InvertedIndex<string, number>();

	built.index(1, ["the", "quick", "fox"]);
	built.index(2, ["the", "lazy", "dog"]);
	built.index(3, ["quick", "brown", "dog"]);

	return built;
};

const sorted = (docs: Iterable<number>): number[] =>
	Array.from(docs).sort((a, b) => a - b);

suite("InvertedIndex", () => {
	test("should map a token to every document holding it", () => {
		const inverted = index();

		expect(sorted(inverted.get("the"))).toEqual([1, 2]);
		expect(sorted(inverted.get("quick"))).toEqual([1, 3]);
		expect(sorted(inverted.get("absent"))).toEqual([]);
	});

	test("should count postings, tokens and documents separately", () => {
		const inverted = index();

		expect(inverted.count()).toBe(9);
		// the, quick, fox, lazy, dog, brown
		expect(inverted.keyCount()).toBe(6);
		expect(inverted.documentCount()).toBe(3);
		expect(inverted.countFor("the")).toBe(2);
	});

	test("should be idempotent for a repeated posting", () => {
		const inverted = new InvertedIndex<string, number>();

		inverted.add("a", 1);
		inverted.add("a", 1);

		expect(inverted.count()).toBe(1);
		expect(inverted.countFor("a")).toBe(1);
	});

	test("should answer has and hasEntry", () => {
		const inverted = index();

		expect(inverted.has("the")).toBe(true);
		expect(inverted.has("absent")).toBe(false);
		expect(inverted.hasEntry("the", 1)).toBe(true);
		expect(inverted.hasEntry("the", 3)).toBe(false);
		expect(inverted.hasEntry("absent", 1)).toBe(false);
	});

	test("should add many documents under one token", () => {
		const inverted = new InvertedIndex<string, number>();

		inverted.addAll("shared", [1, 2, 3]);

		expect(sorted(inverted.get("shared"))).toEqual([1, 2, 3]);
	});

	test("should accept an initial iterable of postings", () => {
		const inverted = new InvertedIndex<string, number>([
			["a", 1],
			["a", 2],
		]);

		expect(inverted.countFor("a")).toBe(2);
	});

	suite("search", () => {
		test("should return documents holding every token", () => {
			const inverted = index();

			expect(sorted(inverted.search(["the", "dog"]))).toEqual([2]);
			expect(sorted(inverted.search(["quick"]))).toEqual([1, 3]);
		});

		test("should return nothing when a token is absent entirely", () => {
			const inverted = index();

			expect(sorted(inverted.search(["the", "absent"]))).toEqual([]);
		});

		test("should return nothing when no document holds all tokens", () => {
			const inverted = index();

			expect(sorted(inverted.search(["fox", "dog"]))).toEqual([]);
		});

		test("should match nothing for an empty conjunction", () => {
			const inverted = index();

			expect(sorted(inverted.search([]))).toEqual([]);
		});

		test("should return documents holding any token, without duplicates", () => {
			const inverted = index();

			expect(sorted(inverted.searchAny(["fox", "dog"]))).toEqual([1, 2, 3]);
			expect(sorted(inverted.searchAny(["the", "quick"]))).toEqual([1, 2, 3]);
			expect(sorted(inverted.searchAny(["absent"]))).toEqual([]);
			expect(sorted(inverted.searchAny([]))).toEqual([]);
		});
	});

	suite("deletion", () => {
		test("should delete a token and every posting under it", () => {
			const inverted = index();

			expect(inverted.delete("the")).toBe(2);
			expect(inverted.delete("the")).toBe(0);

			expect(inverted.has("the")).toBe(false);
			expect(inverted.count()).toBe(7);
			expect(inverted.documentCount()).toBe(3);
		});

		test("should delete a single posting and drop an emptied token", () => {
			const inverted = new InvertedIndex<string, number>();

			inverted.add("only", 1);

			expect(inverted.deleteEntry("only", 1)).toBe(true);
			expect(inverted.deleteEntry("only", 1)).toBe(false);

			expect(inverted.has("only")).toBe(false);
			expect(inverted.documentCount()).toBe(0);
		});

		test("should remove a document from every posting list", () => {
			const inverted = index();

			expect(inverted.deleteDocument(1)).toBe(true);
			expect(inverted.deleteDocument(1)).toBe(false);

			expect(sorted(inverted.get("the"))).toEqual([2]);
			expect(sorted(inverted.get("quick"))).toEqual([3]);
			expect(inverted.has("fox")).toBe(false);
			expect(inverted.documentCount()).toBe(2);
			expect(inverted.count()).toBe(6);
		});

		test("should let a deleted document be re-indexed", () => {
			const inverted = index();

			inverted.deleteDocument(1);
			inverted.index(1, ["new", "tokens"]);

			expect(sorted(inverted.search(["new", "tokens"]))).toEqual([1]);
			expect(inverted.hasEntry("fox", 1)).toBe(false);
		});

		test("should clear everything", () => {
			const inverted = index();

			inverted.clear();

			expect(inverted.count()).toBe(0);
			expect(inverted.keyCount()).toBe(0);
			expect(inverted.documentCount()).toBe(0);
		});
	});

	test("should iterate tokens, documents and entries", () => {
		const inverted = new InvertedIndex<string, number>();

		inverted.index(1, ["a", "b"]);

		expect(Array.from(inverted.keys())).toEqual(["a", "b"]);
		expect(Array.from(inverted.documentIds())).toEqual([1]);
		expect(Array.from(inverted.entries())).toEqual([
			["a", 1],
			["b", 1],
		]);
		expect(Array.from(inverted)).toEqual(Array.from(inverted.entries()));
	});
});
