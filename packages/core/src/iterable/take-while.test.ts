import { describe, expect, it } from "vitest";

import { takeWhile } from "./take-while.js";

describe("takeWhile", () => {
	it("should yield the leading elements that satisfy the predicate", () => {
		expect([...takeWhile([1, 2, 3, 1], (value) => value < 3)]).toEqual([1, 2]);
	});

	it("should yield nothing when the first element is rejected", () => {
		expect([...takeWhile([3, 1, 2], (value) => value < 3)]).toEqual([]);
	});

	it("should yield everything when the predicate always holds", () => {
		expect([...takeWhile([1, 2, 3], () => true)]).toEqual([1, 2, 3]);
	});

	it("should not resume after the first rejection", () => {
		expect([...takeWhile([1, 9, 2], (value) => value < 5)]).toEqual([1]);
	});

	it("should pass the zero-based index to the predicate", () => {
		const seen: number[] = [];
		const taken = [
			...takeWhile(["a", "b", "c"], (_value, index) => {
				seen.push(index);
				return index < 1;
			}),
		];

		expect(seen).toEqual([0, 1]);
		expect(taken).toEqual(["a"]);
	});

	it("should terminate on an infinite iterable", () => {
		function* naturals(): IterableIterator<number> {
			let value = 0;
			while (true) {
				yield value++;
			}
		}

		expect([...takeWhile(naturals(), (value) => value < 3)]).toEqual([0, 1, 2]);
	});

	it("should close the source at the first rejection", () => {
		let returned = false;
		function* closable(): IterableIterator<number> {
			try {
				let value = 0;
				while (true) {
					yield value++;
				}
			} finally {
				returned = true;
			}
		}

		expect([...takeWhile(closable(), (value) => value < 2)]).toEqual([0, 1]);
		expect(returned).toBe(true);
	});
});
