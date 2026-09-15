import { compareNaturalAscending } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { quickselect } from "./quickselect.js";

describe("quickselect", () => {
	it("should select the k-th smallest element for every k", () => {
		const values = [9, 3, 7, 1, 8, 2, 5, 4, 6];
		const sorted = values.toSorted(compareNaturalAscending);

		for (let k = 0; k < values.length; k++) {
			expect(quickselect(values.slice(), k, compareNaturalAscending)).toBe(
				sorted[k],
			);
		}
	});

	it("should partition items so everything before k is not greater and after k is not smaller", () => {
		const values = [5, 1, 4, 2, 8, 9, 3];
		const working = values.slice();
		const k = 3;

		const selected = quickselect(working, k, compareNaturalAscending);

		for (let index = 0; index < k; index++) {
			expect(working[index]!).toBeLessThanOrEqual(selected);
		}
		for (let index = k + 1; index < working.length; index++) {
			expect(working[index]!).toBeGreaterThanOrEqual(selected);
		}
	});

	it("should handle a single-element array", () => {
		expect(quickselect([42], 0, compareNaturalAscending)).toBe(42);
	});

	it("should handle duplicate values", () => {
		const values = [3, 3, 3, 1, 3];
		expect(quickselect(values.slice(), 0, compareNaturalAscending)).toBe(1);
		expect(quickselect(values.slice(), 4, compareNaturalAscending)).toBe(3);
	});
});
