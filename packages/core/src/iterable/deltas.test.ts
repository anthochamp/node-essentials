import { describe, expect, it } from "vitest";

import { deltas } from "./deltas.js";

const subtractNumbers = (current: number, previous: number): number =>
	current - previous;

describe("deltas", () => {
	it("should yield consecutive differences", () => {
		expect([...deltas([1, 3, 6, 10], subtractNumbers)]).toEqual([2, 3, 4]);
	});

	it("should yield one fewer value than there are elements", () => {
		expect([...deltas([1, 2, 3, 4, 5], subtractNumbers)]).toHaveLength(4);
	});

	it("should make an increase positive", () => {
		expect([...deltas([1, 5], subtractNumbers)]).toEqual([4]);
	});

	it("should make a decrease negative", () => {
		expect([...deltas([5, 1], subtractNumbers)]).toEqual([-4]);
	});

	it("should yield nothing for fewer than two elements", () => {
		expect([...deltas([1], subtractNumbers)]).toEqual([]);
		expect([...deltas([], subtractNumbers)]).toEqual([]);
	});

	it("should apply a non-numeric subtraction", () => {
		const dates = [new Date(0), new Date(1000), new Date(3000)];

		expect([
			...deltas(dates, (current, previous) =>
				Math.trunc((current.getTime() - previous.getTime()) / 1000),
			),
		]).toEqual([1, 2]);
	});

	it("should produce a type unrelated to the input", () => {
		expect([
			...deltas(["a", "ab", "abc"], (current, previous) =>
				current.length > previous.length ? "grew" : "shrank",
			),
		]).toEqual(["grew", "grew"]);
	});

	it("should be lazy", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		deltas(counted(), subtractNumbers).next();

		expect(produced).toBe(2);
	});
});
