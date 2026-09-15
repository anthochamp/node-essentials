import { expect, suite, test } from "vitest";

import { BinaryFp128 } from "./binary-fp128.js";

suite("BinaryFp128", () => {
	// The bit pattern is the full 128-bit binary128 layout, not a binary64
	// approximation: position 127 is the sign, 112..126 the exponent.
	suite("bitAt", () => {
		test("reads the sign bit at position 127", () => {
			expect(BinaryFp128.from(1).bitAt(127)).toBe(0);
			expect(BinaryFp128.from(-1).bitAt(127)).toBe(1);
		});

		test("places the binary128 exponent bias at bits 112..126", () => {
			// 1.0 is exponent bias 16383 = 0x3FFF, significand zero.
			const one = BinaryFp128.from(1);
			for (let position = 0; position < 112; position++) {
				expect(one.bitAt(position)).toBe(0);
			}
			// 0x3FFF is fourteen set bits, so 112..125 are 1 and 126 is 0.
			for (let position = 112; position <= 125; position++) {
				expect(one.bitAt(position)).toBe(1);
			}
			expect(one.bitAt(126)).toBe(0);
		});

		test("rejects a position outside the 128-bit width", () => {
			expect(() => BinaryFp128.from(1).bitAt(128)).toThrow(RangeError);
			expect(() => BinaryFp128.from(1).bitAt(-1)).toThrow(RangeError);
		});
	});

	// valueOf() narrows to a JS number, but the string forms must not: they go
	// through the exact decimal expansion instead.
	suite("string forms keep more than binary64 precision", () => {
		const value = BinaryFp128.from("1.0000000000000000000001");

		test("valueOf collapses to the nearest binary64", () => {
			expect(value.valueOf()).toBe(1);
		});

		test("toString keeps digits binary64 cannot hold", () => {
			expect(value.toString()).not.toBe("1");
		});

		test("toPrecision renders beyond 17 significant digits", () => {
			expect(value.toPrecision(23)).not.toMatch(/^1\.0{22}$/);
		});
	});
});
