import { describe, expect, it } from "vitest";

import { zip } from "./zip.js";

describe("zip", () => {
	it("should pair elements positionally", () => {
		expect([...zip([[1, 2, 3], "abc"])]).toEqual([
			[1, "a"],
			[2, "b"],
			[3, "c"],
		]);
	});

	it("should stop at the shortest iterable", () => {
		expect([...zip([[1, 2, 3], [10]])]).toEqual([[1, 10]]);
	});

	it("should accept more than two iterables", () => {
		expect([...zip([[1], [2], [3], [4]])]).toEqual([[1, 2, 3, 4]]);
	});

	it("should accept a single iterable", () => {
		expect([...zip([[1, 2]])]).toEqual([[1], [2]]);
	});

	it("should yield nothing when given no iterables", () => {
		expect([...zip([])]).toEqual([]);
	});

	it("should yield nothing when any iterable is empty", () => {
		expect([...zip([[1, 2], []])]).toEqual([]);
	});

	it("should accept non-array iterables", () => {
		expect([...zip([new Set([1, 2]), new Set(["a", "b"])])]).toEqual([
			[1, "a"],
			[2, "b"],
		]);
	});

	it("should not pull beyond the tuples requested", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		zip([counted(), counted()]).next();

		expect(produced).toBe(2);
	});

	it("should close every source iterator when the shortest ends", () => {
		let returned = 0;
		function* closable(length: number): IterableIterator<number> {
			try {
				for (let index = 0; index < length; index++) {
					yield index;
				}
			} finally {
				returned++;
			}
		}

		expect([...zip([closable(1), closable(5)])]).toEqual([[0, 0]]);
		expect(returned).toBe(2);
	});

	it("should close every source iterator when the consumer stops early", () => {
		let returned = 0;
		function* closable(): IterableIterator<number> {
			try {
				let value = 0;
				while (true) {
					yield value++;
				}
			} finally {
				returned++;
			}
		}

		for (const _pair of zip([closable(), closable()])) {
			break;
		}

		expect(returned).toBe(2);
	});
});
