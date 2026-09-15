import { describe, expect, it } from "vitest";

import { bigIntFromBytesBe } from "./from-bytes-be.js";
import { bigIntToBytesBe } from "./to-bytes-be.js";

/** X.690 §8.3.2 worked examples, plus the sign-extension boundaries. */
const MINIMAL_VECTORS: readonly (readonly [bigint, readonly number[]])[] = [
	[0n, [0x00]],
	[1n, [0x01]],
	[127n, [0x7f]],
	[128n, [0x00, 0x80]],
	[255n, [0x00, 0xff]],
	[256n, [0x01, 0x00]],
	[-1n, [0xff]],
	[-128n, [0x80]],
	[-129n, [0xff, 0x7f]],
	[-256n, [0xff, 0x00]],
	[-32_768n, [0x80, 0x00]],
];

describe("bigIntToBytesBe", () => {
	it("should produce the minimal two's complement encoding", () => {
		for (const [value, bytes] of MINIMAL_VECTORS) {
			expect([...bigIntToBytesBe(value)]).toStrictEqual([...bytes]);
		}
	});

	it("should sign-extend a negative value to a fixed width", () => {
		expect([...bigIntToBytesBe(-1n, 4)]).toStrictEqual([
			0xff, 0xff, 0xff, 0xff,
		]);
	});

	it("should zero-pad a positive value to a fixed width", () => {
		expect([...bigIntToBytesBe(1n, 4)]).toStrictEqual([0x00, 0x00, 0x00, 0x01]);
	});

	it("should reject a width too small to hold the value", () => {
		expect(() => bigIntToBytesBe(256n, 1)).toThrow(RangeError);
	});
});

describe("bigIntFromBytesBe", () => {
	it("should invert every minimal vector", () => {
		for (const [value] of MINIMAL_VECTORS) {
			expect(bigIntFromBytesBe(bigIntToBytesBe(value))).toBe(value);
		}
	});

	it("should decode zero from an empty input", () => {
		expect(bigIntFromBytesBe(new Uint8Array(0))).toBe(0n);
	});

	it("should read any width back to the same value", () => {
		expect(bigIntFromBytesBe(new Uint8Array([0xff]))).toBe(-1n);
		expect(bigIntFromBytesBe(new Uint8Array([0xff, 0xff]))).toBe(-1n);
		expect(bigIntFromBytesBe(new Uint8Array([0xff, 0xff, 0xff, 0xff]))).toBe(
			-1n,
		);
	});

	it("should round-trip a value wider than 64 bits", () => {
		const value = -((1n << 200n) + 12_345n);

		expect(bigIntFromBytesBe(bigIntToBytesBe(value))).toBe(value);
	});
});
