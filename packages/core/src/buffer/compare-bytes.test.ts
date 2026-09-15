import { describe, expect, it } from "vitest";

import { compareBytes } from "./compare-bytes.js";

describe("compareBytes", () => {
	it("returns 0 for two empty arrays", () => {
		expect(compareBytes(new Uint8Array(0), new Uint8Array(0))).toBe(0);
	});

	it("returns 0 for identical contents", () => {
		expect(
			compareBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
		).toBe(0);
	});

	it("returns negative when a has a smaller byte at the first difference", () => {
		expect(
			compareBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 5, 3])),
		).toBeLessThan(0);
	});

	it("returns positive when a has a larger byte at the first difference", () => {
		expect(
			compareBytes(new Uint8Array([1, 9, 3]), new Uint8Array([1, 5, 3])),
		).toBeGreaterThan(0);
	});

	it("sorts a shorter prefix before its longer extension", () => {
		expect(
			compareBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])),
		).toBeLessThan(0);
		expect(
			compareBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2])),
		).toBeGreaterThan(0);
	});
});
