import { expect, suite, test } from "vitest";

import { chunk } from "./chunk.js";

suite("chunk", () => {
	test("splits into groups of the requested size", () => {
		expect([...chunk([1, 2, 3, 4], 2)]).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	test("yields a short final group when the length is not a multiple", () => {
		expect([...chunk([1, 2, 3, 4, 5], 2)]).toEqual([[1, 2], [3, 4], [5]]);
	});

	test("yields nothing for an empty input", () => {
		expect([...chunk([], 3)]).toEqual([]);
	});

	test("round-trips with Array.prototype.flat", () => {
		const flat = [0, 5, 10, 15, 20, 25];

		expect([...chunk(flat, 2)].flat()).toEqual(flat);
	});

	test("is lazy — it does not consume beyond the groups pulled", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		const iterator = chunk(counted(), 2);
		iterator.next();

		expect(produced).toBe(2);
	});

	test("rejects a non-positive or fractional size", () => {
		expect(() => [...chunk([1], 0)]).toThrow(RangeError);
		expect(() => [...chunk([1], -1)]).toThrow(RangeError);
		expect(() => [...chunk([1], 1.5)]).toThrow(RangeError);
	});
});
