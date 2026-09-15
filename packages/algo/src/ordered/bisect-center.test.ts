import { identity } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { bisectCenter } from "./bisect-center.js";

describe("bisectCenter", () => {
	it("should return the index of the closest element", () => {
		expect(bisectCenter([1, 5, 9], 6, identity)).toBe(1);
		expect(bisectCenter([1, 5, 9], 8, identity)).toBe(2);
	});

	it("should weigh the two neighbours by distance, not by rank", () => {
		expect(bisectCenter([0, 100], 1, identity)).toBe(0);
		expect(bisectCenter([0, 100], 99, identity)).toBe(1);
	});

	it("should resolve a tie to the right-hand neighbour", () => {
		expect(bisectCenter([1, 5, 9], 3, identity)).toBe(1);
	});

	it("should clamp to the first element when the value precedes every key", () => {
		expect(bisectCenter([5, 6, 7], 1, identity)).toBe(0);
	});

	it("should clamp to the last element when the value follows every key", () => {
		expect(bisectCenter([5, 6, 7], 10, identity)).toBe(2);
	});

	it("should return an exact match", () => {
		expect(bisectCenter([1, 5, 9], 5, identity)).toBe(1);
	});

	it("should locate the closest item by a derived key", () => {
		const items = [{ at: 10 }, { at: 20 }, { at: 40 }];

		expect(bisectCenter(items, 23, (item) => item.at)).toBe(1);
		expect(bisectCenter(items, 34, (item) => item.at)).toBe(2);
	});
});
