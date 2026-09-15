import { describe, expect, it } from "vitest";

import { range } from "./range.js";

describe("range", () => {
	it("should count up to an exclusive bound", () => {
		expect([...range(0, 5)]).toEqual([0, 1, 2, 3, 4]);
	});

	it("should start where it is told to", () => {
		expect([...range(2, 5)]).toEqual([2, 3, 4]);
	});

	it("should count down with a negative step", () => {
		expect([...range(5, 0, -1)]).toEqual([5, 4, 3, 2, 1]);
	});

	it("should yield nothing when the bound is already passed", () => {
		expect([...range(5, 0)]).toEqual([]);
		expect([...range(0, 5, -1)]).toEqual([]);
		expect([...range(3, 3)]).toEqual([]);
	});

	it("should not drift on a fractional step", () => {
		expect([...range(0, 1, 0.1)]).toEqual([
			0, 0.1, 0.2, 0.30000000000000004, 0.4, 0.5, 0.6000000000000001,
			0.7000000000000001, 0.8, 0.9,
		]);
	});

	it("should yield the count an accumulating loop gets wrong", () => {
		const accumulated: number[] = [];
		for (let value = 0; value < 1; value += 0.1) {
			accumulated.push(value);
		}

		expect(accumulated).toHaveLength(11);
		expect(accumulated.at(-1)).toBe(0.9999999999999999);
		expect([...range(0, 1, 0.1)]).toHaveLength(10);
		expect([...range(0, 1, 0.1)].at(-1)).toBe(0.9);
	});

	it("should stop before the bound rather than on it", () => {
		expect([...range(0, 10, 3)]).toEqual([0, 3, 6, 9]);
	});

	it("should be lazy enough to accept an infinite bound", () => {
		const iterator = range(0, Number.POSITIVE_INFINITY, 2);

		expect(iterator.next().value).toBe(0);
		expect(iterator.next().value).toBe(2);
		expect(iterator.next().value).toBe(4);
	});

	it("should reject a non-finite start", () => {
		expect(() => [...range(Number.POSITIVE_INFINITY, 1)]).toThrow(RangeError);
		expect(() => [...range(Number.NaN, 1)]).toThrow(RangeError);
	});

	it("should reject a NaN stop", () => {
		expect(() => [...range(0, Number.NaN)]).toThrow(RangeError);
	});

	it("should reject a zero or non-finite step", () => {
		expect(() => [...range(0, 5, 0)]).toThrow(RangeError);
		expect(() => [...range(0, 5, Number.NaN)]).toThrow(RangeError);
		expect(() => [...range(0, 5, Number.POSITIVE_INFINITY)]).toThrow(
			RangeError,
		);
	});
});
