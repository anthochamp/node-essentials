import { describe, expect, it } from "vitest";

import { union } from "./union.js";

describe("union", () => {
	it("should union two iterables with overlap", () => {
		const result = union([
			[1, 2, 3],
			[2, 3, 4],
		]);

		expect(result).toEqual(new Set([1, 2, 3, 4]));
	});

	it("should union any number of iterables", () => {
		const result = union([[1], [2], [3], [1, 2]]);

		expect(result).toEqual(new Set([1, 2, 3]));
	});

	it("should return an empty set when called with no arguments", () => {
		const result = union<number>([]);

		expect(result).toEqual(new Set());
	});

	it("should ignore empty iterables", () => {
		const result = union([[1, 2], []]);

		expect(result).toEqual(new Set([1, 2]));
	});
});
