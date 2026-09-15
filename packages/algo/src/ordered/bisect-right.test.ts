import { compareNaturalAscending } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { bisectRight } from "./bisect-right.js";

describe("bisectRight", () => {
	it("should find the insertion point in a gap", () => {
		expect(bisectRight([1, 3, 5, 7], 4, compareNaturalAscending)).toBe(2);
	});

	it("should return the index after existing duplicates", () => {
		expect(bisectRight([1, 2, 2, 2, 3], 2, compareNaturalAscending)).toBe(4);
	});

	it("should return 0 when the value precedes every element", () => {
		expect(bisectRight([5, 6, 7], 1, compareNaturalAscending)).toBe(0);
	});

	it("should return the array length when the value follows every element", () => {
		expect(bisectRight([5, 6, 7], 10, compareNaturalAscending)).toBe(3);
	});

	it("should return 0 for an empty array", () => {
		expect(bisectRight([], 1, compareNaturalAscending)).toBe(0);
	});
});
