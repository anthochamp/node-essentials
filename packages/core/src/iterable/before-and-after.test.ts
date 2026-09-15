import { describe, expect, it } from "vitest";

import { beforeAndAfter } from "./before-and-after.js";

describe("beforeAndAfter", () => {
	it("should split at the first element failing the predicate", () => {
		const [before, after] = beforeAndAfter([1, 2, 3, 4], (value) => value < 3);

		expect([...before]).toEqual([1, 2]);
		expect([...after]).toEqual([3, 4]);
	});

	it("should start the second half at the failing element", () => {
		const [before, after] = beforeAndAfter([1, 9, 2], (value) => value < 5);

		expect([...before]).toEqual([1]);
		expect([...after]).toEqual([9, 2]);
	});

	it("should leave the second half empty when the predicate always holds", () => {
		const [before, after] = beforeAndAfter([1, 2], () => true);

		expect([...before]).toEqual([1, 2]);
		expect([...after]).toEqual([]);
	});

	it("should leave the first half empty when the predicate fails at once", () => {
		const [before, after] = beforeAndAfter([1, 2], () => false);

		expect([...before]).toEqual([]);
		expect([...after]).toEqual([1, 2]);
	});

	it("should yield nothing on either side for an empty iterable", () => {
		const [before, after] = beforeAndAfter([], () => true);

		expect([...before]).toEqual([]);
		expect([...after]).toEqual([]);
	});

	it("should lose nothing — the halves rejoin into the source", () => {
		const values = [1, 2, 3, 4, 5];
		const [before, after] = beforeAndAfter(values, (value) => value < 3);

		expect([...before, ...after]).toEqual(values);
	});

	it("should drain the first half when the second is read early", () => {
		const [, after] = beforeAndAfter([1, 2, 3, 4], (value) => value < 3);

		expect([...after]).toEqual([3, 4]);
	});

	it("should resume from where an abandoned first half stopped", () => {
		const [before, after] = beforeAndAfter([1, 2, 3, 4], (value) => value < 4);

		for (const _value of before) {
			break;
		}

		expect([...after]).toEqual([2, 3, 4]);
	});

	it("should walk the source only once", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			for (let value = 1; value <= 4; value++) {
				produced++;
				yield value;
			}
		}

		const [before, after] = beforeAndAfter(counted(), (value) => value < 3);

		expect([...before]).toEqual([1, 2]);
		expect([...after]).toEqual([3, 4]);
		expect(produced).toBe(4);
	});

	it("should pass the zero-based index to the predicate", () => {
		const [before, after] = beforeAndAfter(
			["a", "b", "c"],
			(_value, index) => index < 1,
		);

		expect([...before]).toEqual(["a"]);
		expect([...after]).toEqual(["b", "c"]);
	});
});
