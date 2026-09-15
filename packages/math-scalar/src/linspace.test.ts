import { describe, expect, it } from "vitest";

import { linspace } from "./linspace.js";

describe("linspace", () => {
	it("hits both endpoints exactly", () => {
		const samples = linspace(0, 1, 11);

		expect(samples).toHaveLength(11);
		expect(samples[0]).toBe(0);
		expect(samples[10]).toBe(1);
	});

	it("avoids the drift an accumulated step would introduce", () => {
		const samples = linspace(0, 1, 11);

		let accumulated = 0;
		for (let index = 0; index < 3; index++) {
			accumulated += 0.1;
		}

		expect(accumulated).toBe(0.30000000000000004);
		expect(samples[3]).toBe(0.3);
		expect(samples.at(-1)).toBe(1);
	});

	it("spaces samples evenly", () => {
		expect(linspace(0, 10, 5)).toStrictEqual([0, 2.5, 5, 7.5, 10]);
	});

	it("descends when stop is below start", () => {
		expect(linspace(2, -2, 5)).toStrictEqual([2, 1, 0, -1, -2]);
	});

	it("yields only the start for a single sample", () => {
		expect(linspace(3, 9, 1)).toStrictEqual([3]);
	});

	it("yields both endpoints for two samples", () => {
		expect(linspace(3, 9, 2)).toStrictEqual([3, 9]);
	});

	it("repeats a degenerate interval", () => {
		expect(linspace(5, 5, 3)).toStrictEqual([5, 5, 5]);
	});

	it("rejects a non-positive or non-integer count", () => {
		expect(() => linspace(0, 1, 0)).toThrow(RangeError);
		expect(() => linspace(0, 1, -1)).toThrow(RangeError);
		expect(() => linspace(0, 1, 2.5)).toThrow(RangeError);
		expect(() => linspace(0, 1, Number.NaN)).toThrow(RangeError);
	});

	it("rejects a non-finite endpoint", () => {
		expect(() => linspace(0, Number.POSITIVE_INFINITY, 3)).toThrow(RangeError);
		expect(() => linspace(Number.NaN, 1, 3)).toThrow(RangeError);
	});
});
