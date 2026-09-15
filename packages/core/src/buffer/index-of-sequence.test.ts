import { describe, expect, it } from "vitest";

import { indexOfSequence } from "./index-of-sequence.js";

describe("indexOfSequence", () => {
	it("should find a sequence in the middle of the haystack", () => {
		const haystack = new Uint8Array([1, 2, 3, 4, 5]);
		const needle = new Uint8Array([3, 4]);
		expect(indexOfSequence(haystack, needle)).toBe(2);
	});

	it("should return -1 when not found", () => {
		const haystack = new Uint8Array([1, 2, 3]);
		const needle = new Uint8Array([4, 5]);
		expect(indexOfSequence(haystack, needle)).toBe(-1);
	});

	it("should return from for an empty needle", () => {
		const haystack = new Uint8Array([1, 2, 3]);
		expect(indexOfSequence(haystack, new Uint8Array(0), 2)).toBe(2);
	});

	it("should respect the from offset", () => {
		const haystack = new Uint8Array([1, 2, 1, 2]);
		const needle = new Uint8Array([1, 2]);
		expect(indexOfSequence(haystack, needle, 1)).toBe(2);
	});

	it("should not match a needle longer than the remaining haystack", () => {
		const haystack = new Uint8Array([1, 2, 3]);
		const needle = new Uint8Array([2, 3, 4]);
		expect(indexOfSequence(haystack, needle)).toBe(-1);
	});
});
