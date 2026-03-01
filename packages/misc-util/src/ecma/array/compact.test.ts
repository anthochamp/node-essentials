import { describe, expect, it } from "vitest";
import { compact } from "./compact.js";

describe("compact", () => {
	it("removes null and undefined from a mixed array", () => {
		const input = [1, null, 2, undefined, 3, null, 4, undefined];
		const result = compact(input);
		expect(result).toEqual([1, 2, 3, 4]);
	});

	it("returns an empty array if all elements are null or undefined", () => {
		const input = [null, undefined, undefined, null];
		const result = compact(input);
		expect(result).toEqual([]);
	});

	it("returns the same array if there are no null or undefined values", () => {
		const input = [1, 2, 3];
		const result = compact(input);
		expect(result).toEqual([1, 2, 3]);
	});

	it("works with arrays of strings", () => {
		const input = ["a", null, "b", undefined, "c"];
		const result = compact(input);
		expect(result).toEqual(["a", "b", "c"]);
	});

	it("works with empty array", () => {
		const input: Array<number | null | undefined> = [];
		const result = compact(input);
		expect(result).toEqual([]);
	});
});
