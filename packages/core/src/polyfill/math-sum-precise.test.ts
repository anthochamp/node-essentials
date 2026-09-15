import { describe, expect, it } from "vitest";

import { sumPrecise } from "./math-sum-precise.js";

describe("sumPrecise", () => {
	it("recovers a total that naive summation loses", () => {
		// The 1 is swallowed by 1e100, then cancelled away again.
		const values = [1e100, 1, -1e100];

		expect(sumPrecise(values)).toBe(1);
		expect(values.reduce((total, value) => total + value, 0)).toBe(0);
	});

	it("stays exact where a naive total drifts", () => {
		const values: number[] = Array.from({ length: 10 }, () => 0.1);

		expect(sumPrecise(values)).toBe(1);
		expect(values.reduce((total, value) => total + value, 0)).not.toBe(1);
	});

	it("matches plain addition on well-conditioned input", () => {
		expect(sumPrecise([1, 2, 3, 4, 5])).toBe(15);
		expect(sumPrecise([0.5, 0.25, 0.125])).toBe(0.875);
	});

	it("is order-independent", () => {
		const values = [1e100, 1, -1e100, 1e-100, 3];

		expect(sumPrecise([...values].reverse())).toBe(sumPrecise(values));
	});

	it("answers -0 for an empty input", () => {
		expect(Object.is(sumPrecise([]), -0)).toBe(true);
	});

	it("keeps a single value intact", () => {
		expect(sumPrecise([42.5])).toBe(42.5);
	});

	it("propagates infinities and their conflict", () => {
		expect(sumPrecise([1, Number.POSITIVE_INFINITY])).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(sumPrecise([1, Number.NEGATIVE_INFINITY])).toBe(
			Number.NEGATIVE_INFINITY,
		);
		expect(
			sumPrecise([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]),
		).toBeNaN();
	});

	it("propagates NaN", () => {
		expect(sumPrecise([1, Number.NaN])).toBeNaN();
		expect(sumPrecise([Number.NaN, Number.POSITIVE_INFINITY])).toBeNaN();
	});

	it("accepts any iterable", () => {
		function* generate(): Generator<number> {
			yield 0.1;
			yield 0.2;
		}

		expect(sumPrecise(generate())).toBe(0.30000000000000004);
	});

	it("compensates intermediate overflow", () => {
		const big = Number.MAX_VALUE;

		expect(sumPrecise([big, big, -big, -big])).toBe(0);
		expect(sumPrecise([big, big, -big])).toBe(big);
		expect(sumPrecise([big, big])).toBe(Number.POSITIVE_INFINITY);
	});
});
