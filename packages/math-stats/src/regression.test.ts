import { expect, suite, test } from "vitest";

import { linearRegressionSlope } from "./regression.js";

suite("linearRegressionSlope", () => {
	test("computes the slope of paired coordinates", () => {
		expect(linearRegressionSlope([1, 2, 3], [2, 4, 6])).toBe(2);
	});

	test("supports non-unit x spacing", () => {
		expect(linearRegressionSlope([0, 10, 20], [5, 10, 15])).toBe(0.5);
	});

	test("returns zero for fewer than two points", () => {
		expect(linearRegressionSlope([1], [2])).toBe(0);
	});

	test("rejects coordinate arrays with different lengths", () => {
		expect(() => linearRegressionSlope([1, 2], [3])).toThrow(RangeError);
	});
});
