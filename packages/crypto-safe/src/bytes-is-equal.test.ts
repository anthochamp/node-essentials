import { describe, expect, it } from "vitest";

import { constantTimeBytesIsEqual } from "./bytes-is-equal.js";

describe("constantTimeBytesIsEqual", () => {
	it("returns true for identical byte strings", () => {
		const a = new Uint8Array([1, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 4]);

		expect(constantTimeBytesIsEqual(a, b)).toBe(true);
	});

	it("returns false when any byte differs", () => {
		const a = new Uint8Array([1, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 5]);

		expect(constantTimeBytesIsEqual(a, b)).toBe(false);
	});

	it("returns false when the first byte differs", () => {
		const a = new Uint8Array([9, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 4]);

		expect(constantTimeBytesIsEqual(a, b)).toBe(false);
	});

	it("returns true for two empty inputs", () => {
		expect(constantTimeBytesIsEqual(new Uint8Array(0), new Uint8Array(0))).toBe(
			true,
		);
	});

	it("throws on a length mismatch", () => {
		expect(() =>
			constantTimeBytesIsEqual(new Uint8Array(4), new Uint8Array(5)),
		).toThrow(RangeError);
	});
});
