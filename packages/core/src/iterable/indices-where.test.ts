import { describe, expect, it } from "vitest";

import { indicesWhere, lastIndicesWhere } from "./indices-where.js";

describe("indicesWhere", () => {
	it("should yield the indices of matching elements", () => {
		expect([...indicesWhere([1, 2, 3, 4], (value) => value % 2 === 0)]).toEqual(
			[1, 3],
		);
	});

	it("should yield nothing when nothing matches", () => {
		expect([...indicesWhere([1, 3], (value) => value % 2 === 0)]).toEqual([]);
	});

	it("should yield every index when everything matches", () => {
		expect([...indicesWhere([1, 2, 3], () => true)]).toEqual([0, 1, 2]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...indicesWhere([], () => true)]).toEqual([]);
	});

	it("should pass the index to the predicate", () => {
		expect([...indicesWhere("abc", (_value, index) => index > 0)]).toEqual([
			1, 2,
		]);
	});

	it("should agree with a filtered Array.prototype.entries walk", () => {
		const values = [5, 8, 13, 20];
		const isEven = (value: number): boolean => value % 2 === 0;
		const expected = [...values.entries()]
			.filter(([, value]) => isEven(value))
			.map(([index]) => index);

		expect([...indicesWhere(values, isEven)]).toEqual(expected);
	});

	it("should be lazy", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		indicesWhere(counted(), () => true).next();

		expect(produced).toBe(1);
	});
});

describe("lastIndicesWhere", () => {
	it("should yield the indices of matching elements, descending", () => {
		expect([
			...lastIndicesWhere([1, 2, 3, 4], (value) => value % 2 === 0),
		]).toEqual([3, 1]);
	});

	it("should count indices from the start, not the end", () => {
		expect([...lastIndicesWhere([1, 2, 3], (value) => value === 1)]).toEqual([
			0,
		]);
	});

	it("should be the reverse of indicesWhere", () => {
		const values = [1, 2, 3, 4, 5, 6];
		const isEven = (value: number): boolean => value % 2 === 0;

		expect([...lastIndicesWhere(values, isEven)]).toEqual(
			[...indicesWhere(values, isEven)].reverse(),
		);
	});

	it("should yield nothing when nothing matches", () => {
		expect([...lastIndicesWhere([1, 3], (value) => value % 2 === 0)]).toEqual(
			[],
		);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...lastIndicesWhere([], () => true)]).toEqual([]);
	});

	it("should materialise a non-array source", () => {
		function* generated(): IterableIterator<number> {
			yield* [1, 2, 3];
		}

		expect([...lastIndicesWhere(generated(), () => true)]).toEqual([2, 1, 0]);
	});
});
