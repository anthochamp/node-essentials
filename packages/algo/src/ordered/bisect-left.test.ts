import { compareNaturalAscending } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { bisectLeft } from "./bisect-left.js";

describe("bisectLeft", () => {
	it("should find the insertion point in a gap", () => {
		expect(bisectLeft([1, 3, 5, 7], 4, compareNaturalAscending)).toBe(2);
	});

	it("should return the index before existing duplicates", () => {
		expect(bisectLeft([1, 2, 2, 2, 3], 2, compareNaturalAscending)).toBe(1);
	});

	it("should return 0 when the value precedes every element", () => {
		expect(bisectLeft([5, 6, 7], 1, compareNaturalAscending)).toBe(0);
	});

	it("should return the array length when the value follows every element", () => {
		expect(bisectLeft([5, 6, 7], 10, compareNaturalAscending)).toBe(3);
	});

	it("should return 0 for an empty array", () => {
		expect(bisectLeft([], 1, compareNaturalAscending)).toBe(0);
	});

	it("should support a comparator against a differently-typed search value", () => {
		const items = [{ id: 1 }, { id: 3 }, { id: 5 }];
		const compare = (item: { id: number }, value: number) => item.id - value;

		expect(bisectLeft(items, 3, compare)).toBe(1);
	});
});
