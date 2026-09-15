import { describe, expect, it } from "vitest";

import { difference } from "./difference.js";

describe("difference", () => {
	it("should return elements in a but not in b", () => {
		const result = difference([1, 2, 3], [2, 3]);

		expect(result).toEqual(new Set([1]));
	});

	it("should return an empty set when a is a subset of b", () => {
		const result = difference([1, 2], [1, 2, 3]);

		expect(result).toEqual(new Set());
	});

	it("should return all of a when b is empty", () => {
		const result = difference([1, 2], []);

		expect(result).toEqual(new Set([1, 2]));
	});
});
