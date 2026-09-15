import { describe, expect, it } from "vitest";

import { symmetricDifference } from "./symmetric-difference.js";

describe("symmetricDifference", () => {
	it("should return elements in exactly one of a or b", () => {
		const result = symmetricDifference([1, 2, 3], [2, 3, 4]);

		expect(result).toEqual(new Set([1, 4]));
	});

	it("should return an empty set when a and b are equal", () => {
		const result = symmetricDifference([1, 2], [1, 2]);

		expect(result).toEqual(new Set());
	});

	it("should return the union when a and b are disjoint", () => {
		const result = symmetricDifference([1, 2], [3, 4]);

		expect(result).toEqual(new Set([1, 2, 3, 4]));
	});
});
