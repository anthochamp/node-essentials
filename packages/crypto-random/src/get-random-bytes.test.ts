import { describe, expect, it } from "vitest";

import { getRandomBytes } from "./get-random-bytes.js";

describe("getRandomBytes", () => {
	it("returns a Uint8Array of the requested length", () => {
		expect(getRandomBytes(32)).toHaveLength(32);
	});

	it("returns an empty array for length 0", () => {
		expect(getRandomBytes(0)).toHaveLength(0);
	});

	it("does not return the same bytes twice in a row", () => {
		const first = getRandomBytes(32);
		const second = getRandomBytes(32);

		expect(first).not.toEqual(second);
	});

	it("chunks across the 65,536-byte getRandomValues limit", () => {
		const length = 65_536 + 1024;

		expect(getRandomBytes(length)).toHaveLength(length);
	});

	it("throws for a negative length", () => {
		expect(() => getRandomBytes(-1)).toThrow(RangeError);
	});

	it("throws for a non-integer length", () => {
		expect(() => getRandomBytes(1.5)).toThrow(RangeError);
	});
});
