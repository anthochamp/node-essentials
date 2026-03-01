import { expect, suite, test } from "vitest";
import { minmax } from "./minmax.js";

suite("minmax", () => {
	test("calculates the minimum and maximum values from a list of numbers", () => {
		expect(minmax(1, 2, 3, 4, 5)).toEqual({ min: 1, max: 5 });
		expect(minmax(-1, -2, -3, -4, -5)).toEqual({ min: -5, max: -1 });
		expect(minmax(1.5, 2.5, 3.5)).toEqual({ min: 1.5, max: 3.5 });
		expect(minmax()).toEqual({ min: Infinity, max: -Infinity });
	});
});
