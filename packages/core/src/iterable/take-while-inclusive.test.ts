import { describe, expect, it } from "vitest";

import { takeWhileInclusive } from "./take-while-inclusive.js";
import { takeWhile } from "./take-while.js";

describe("takeWhileInclusive", () => {
	it("should keep the element that fails the predicate", () => {
		expect([...takeWhileInclusive([1, 2, 3, 4], (value) => value < 3)]).toEqual(
			[1, 2, 3],
		);
	});

	it("should yield exactly one more element than takeWhile", () => {
		const values = [1, 2, 3, 4];
		const predicate = (value: number): boolean => value < 3;

		expect([...takeWhileInclusive(values, predicate)]).toHaveLength(
			[...takeWhile(values, predicate)].length + 1,
		);
	});

	it("should yield only the first element when it already fails", () => {
		expect([...takeWhileInclusive([9, 1], (value) => value < 3)]).toEqual([9]);
	});

	it("should yield everything when the predicate always holds", () => {
		expect([...takeWhileInclusive([1, 2], () => true)]).toEqual([1, 2]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...takeWhileInclusive([], () => true)]).toEqual([]);
	});

	it("should pass the zero-based index to the predicate", () => {
		expect([
			...takeWhileInclusive(["a", "b", "c"], (_value, index) => index < 1),
		]).toEqual(["a", "b"]);
	});

	it("should terminate on an infinite iterable", () => {
		function* naturals(): IterableIterator<number> {
			let value = 0;
			while (true) {
				yield value++;
			}
		}

		expect([...takeWhileInclusive(naturals(), (value) => value < 2)]).toEqual([
			0, 1, 2,
		]);
	});
});
