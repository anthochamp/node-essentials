import { describe, expect, it } from "vitest";

import { welchTStatistic } from "./welch-t-statistic.js";

describe("welchTStatistic", () => {
	it("matches a hand-computed example with unequal variance", () => {
		const a = [1, 2, 3, 4, 5];
		const b = [2, 4, 6, 8, 10];

		const { t, degreesOfFreedom } = welchTStatistic(a, b);

		expect(t).toBeCloseTo(-1.8973665961010275, 10);
		expect(degreesOfFreedom).toBeCloseTo(5.882352941176471, 10);
	});

	it("negates when the samples are swapped, keeping degrees of freedom", () => {
		const a = [1, 2, 3, 4, 5];
		const b = [2, 4, 6, 8, 10];

		const forward = welchTStatistic(a, b);
		const reversed = welchTStatistic(b, a);

		expect(reversed.t).toBeCloseTo(-forward.t, 10);
		expect(reversed.degreesOfFreedom).toBeCloseTo(forward.degreesOfFreedom, 10);
	});

	it("is zero for two samples with the same mean", () => {
		const { t } = welchTStatistic([1, 2, 3], [0, 2, 4]);

		expect(t).toBe(0);
	});

	it("rejects a sample with fewer than two values", () => {
		expect(() => welchTStatistic([1], [1, 2])).toThrow(RangeError);
		expect(() => welchTStatistic([1, 2], [1])).toThrow(RangeError);
	});
});
