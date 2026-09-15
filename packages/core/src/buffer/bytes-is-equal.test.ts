import { describe, expect, it } from "vitest";

import { bytesIsEqual } from "./bytes-is-equal.js";

describe("bytesIsEqual", () => {
	it("returns true for two empty arrays", () => {
		expect(bytesIsEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
	});

	it("returns true for identical contents", () => {
		expect(
			bytesIsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
		).toBe(true);
	});

	it("returns false for different lengths", () => {
		expect(
			bytesIsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2])),
		).toBe(false);
	});

	it("returns false for same length but different contents", () => {
		expect(
			bytesIsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
		).toBe(false);
	});
});
