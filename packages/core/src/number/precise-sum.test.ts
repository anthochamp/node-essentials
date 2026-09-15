import { describe, expect, it } from "vitest";

import { PreciseSum } from "./precise-sum.js";

describe("PreciseSum", () => {
	it("answers -0 before anything is added", () => {
		expect(Object.is(new PreciseSum().value, -0)).toBe(true);
	});

	it("recovers a total that naive summation loses", () => {
		const total = new PreciseSum();

		total.add(1e100);
		total.add(1);
		total.add(-1e100);

		expect(total.value).toBe(1);
	});

	it("can be read part-way through and keeps accumulating", () => {
		const total = new PreciseSum();

		total.add(1e100);
		total.add(1);

		expect(total.value).toBe(1e100);

		total.add(-1e100);

		expect(total.value).toBe(1);
	});

	it("is unchanged by reading it twice", () => {
		const total = new PreciseSum();

		for (let index = 0; index < 10; index++) {
			total.add(0.1);
		}

		expect(total.value).toBe(1);
		expect(total.value).toBe(1);
	});

	it("keeps parallel totals independent", () => {
		const left = new PreciseSum();
		const right = new PreciseSum();

		for (const value of [1e100, 1, -1e100]) {
			left.add(value);
			right.add(-value);
		}

		expect(left.value).toBe(1);
		expect(right.value).toBe(-1);
	});

	it("propagates infinities and their conflict", () => {
		const positive = new PreciseSum();

		positive.add(1);
		positive.add(Number.POSITIVE_INFINITY);

		expect(positive.value).toBe(Number.POSITIVE_INFINITY);

		positive.add(Number.NEGATIVE_INFINITY);

		expect(positive.value).toBeNaN();
	});

	it("propagates NaN whatever else was added", () => {
		const total = new PreciseSum();

		total.add(Number.NaN);
		total.add(1);

		expect(total.value).toBeNaN();
	});

	describe("intermediate overflow", () => {
		it("comes back from a partial sum that left the finite range", () => {
			const total = new PreciseSum();

			for (const value of [
				Number.MAX_VALUE,
				Number.MAX_VALUE,
				-Number.MAX_VALUE,
				-Number.MAX_VALUE,
			]) {
				total.add(value);
			}

			expect(total.value).toBe(0);
		});

		it("keeps a small remainder that only survives the round trip", () => {
			const total = new PreciseSum();

			total.add(Number.MAX_VALUE);
			total.add(Number.MAX_VALUE);
			total.add(-Number.MAX_VALUE);
			total.add(-Number.MAX_VALUE);
			total.add(1);

			expect(total.value).toBe(1);
		});

		it("still reports infinity for a genuine overflow", () => {
			const total = new PreciseSum();

			total.add(Number.MAX_VALUE);
			total.add(Number.MAX_VALUE);

			expect(total.value).toBe(Number.POSITIVE_INFINITY);

			total.add(-Number.MAX_VALUE);

			expect(total.value).toBe(Number.MAX_VALUE);
		});

		it("rounds back to MAX_VALUE instead of overflowing", () => {
			const total = new PreciseSum();

			total.add(2 ** 1023);
			total.add(2 ** 1023);
			total.add(-(2 ** 971 / 2));
			total.add(-1);

			expect(total.value).toBe(Number.MAX_VALUE);
		});

		it("handles the negative direction the same way", () => {
			const total = new PreciseSum();

			total.add(-Number.MAX_VALUE);
			total.add(-Number.MAX_VALUE);
			total.add(Number.MAX_VALUE);
			total.add(Number.MAX_VALUE);

			expect(total.value).toBe(0);
		});
	});
});
