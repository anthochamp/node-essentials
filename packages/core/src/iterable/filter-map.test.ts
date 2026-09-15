import { describe, expect, it } from "vitest";

import { filterMap } from "./filter-map.js";

describe("filterMap", () => {
	it("should map and drop in one pass", () => {
		expect([
			...filterMap([1, 2, 3, 4], (value) =>
				value % 2 === 0 ? value * 10 : undefined,
			),
		]).toEqual([20, 40]);
	});

	it("should yield nothing when the mapper always declines", () => {
		expect([...filterMap([1, 2], () => undefined)]).toEqual([]);
	});

	it("should map everything when the mapper never declines", () => {
		expect([...filterMap([1, 2], (value) => value * 2)]).toEqual([2, 4]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...filterMap([], (value) => value)]).toEqual([]);
	});

	it("should keep a null result rather than treating it as declined", () => {
		expect([
			...filterMap([1, 2], (value) => (value === 1 ? null : undefined)),
		]).toEqual([null]);
	});

	it("should pass the zero-based index to the mapper", () => {
		expect([
			...filterMap(["a", "b", "c"], (value, index) =>
				index % 2 === 0 ? `${value}${index}` : undefined,
			),
		]).toEqual(["a0", "c2"]);
	});

	it("should walk the source once", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			for (let value = 1; value <= 4; value++) {
				produced++;
				yield value;
			}
		}

		expect([...filterMap(counted(), (value) => value)]).toHaveLength(4);
		expect(produced).toBe(4);
	});

	it("should agree with a map-then-filter chain", () => {
		const values = [1, 2, 3, 4, 5];
		const mapper = (value: number): number | undefined =>
			value % 2 === 0 ? value * 10 : undefined;

		expect([...filterMap(values, mapper)]).toEqual(
			values
				.map((value) => mapper(value))
				.filter((value) => value !== undefined),
		);
	});

	it("should be lazy", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		filterMap(counted(), (value) => value).next();

		expect(produced).toBe(1);
	});
});
