import { describe, expect, it } from "vitest";

import { intersection } from "./intersection.js";

describe("intersection", () => {
	it("should intersect two iterables with common elements", () => {
		const result = intersection([
			[1, 2, 3],
			[2, 3, 4],
		]);

		expect(result).toEqual(new Set([2, 3]));
	});

	it("should intersect more than two iterables", () => {
		const result = intersection([
			[1, 2, 3],
			[2, 3, 4],
			[2, 5],
		]);

		expect(result).toEqual(new Set([2]));
	});

	it("should return an empty set when iterables have no common elements", () => {
		const result = intersection([
			[1, 2],
			[3, 4],
		]);

		expect(result).toEqual(new Set());
	});

	it("should return an empty set when called with no arguments", () => {
		const result = intersection<number>([]);

		expect(result).toEqual(new Set());
	});

	it("should short-circuit once the running result is empty", () => {
		const result = intersection([
			[1, 2],
			[3, 4],
			[1, 2],
		]);

		expect(result).toEqual(new Set());
	});
});
