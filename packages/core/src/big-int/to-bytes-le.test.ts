import { describe, expect, it } from "vitest";

import { bigIntFromBytesBe } from "./from-bytes-be.js";
import { bigIntFromBytesLe } from "./from-bytes-le.js";
import { bigIntToBytesBe } from "./to-bytes-be.js";
import { bigIntToBytesLe } from "./to-bytes-le.js";

/** The big-endian vectors, byte-reversed. */
const MINIMAL_VECTORS: readonly (readonly [bigint, readonly number[]])[] = [
	[0n, [0x00]],
	[1n, [0x01]],
	[127n, [0x7f]],
	[128n, [0x80, 0x00]],
	[255n, [0xff, 0x00]],
	[256n, [0x00, 0x01]],
	[-1n, [0xff]],
	[-128n, [0x80]],
	[-129n, [0x7f, 0xff]],
	[-256n, [0x00, 0xff]],
	[-32_768n, [0x00, 0x80]],
];

describe("bigIntToBytesLe", () => {
	it("should produce the minimal two's complement encoding", () => {
		for (const [value, bytes] of MINIMAL_VECTORS) {
			expect([...bigIntToBytesLe(value)]).toStrictEqual([...bytes]);
		}
	});

	it("should sign-extend a negative value to a fixed width", () => {
		expect([...bigIntToBytesLe(-1n, 4)]).toStrictEqual([
			0xff, 0xff, 0xff, 0xff,
		]);
	});

	it("should zero-pad a positive value to a fixed width", () => {
		expect([...bigIntToBytesLe(1n, 4)]).toStrictEqual([0x01, 0x00, 0x00, 0x00]);
	});

	it("should reject a width too small to hold the value", () => {
		expect(() => bigIntToBytesLe(256n, 1)).toThrow(RangeError);
	});

	it("should be the big-endian encoding reversed", () => {
		for (const [value] of MINIMAL_VECTORS) {
			expect([...bigIntToBytesLe(value)]).toStrictEqual(
				[...bigIntToBytesBe(value)].reverse(),
			);
		}
	});
});

describe("bigIntFromBytesLe", () => {
	it("should invert every minimal vector", () => {
		for (const [value] of MINIMAL_VECTORS) {
			expect(bigIntFromBytesLe(bigIntToBytesLe(value))).toBe(value);
		}
	});

	it("should decode zero from an empty input", () => {
		expect(bigIntFromBytesLe(new Uint8Array(0))).toBe(0n);
	});

	it("should read the sign from the last byte, at any width", () => {
		expect(bigIntFromBytesLe(new Uint8Array([0xff]))).toBe(-1n);
		expect(bigIntFromBytesLe(new Uint8Array([0xff, 0xff]))).toBe(-1n);
		expect(bigIntFromBytesLe(new Uint8Array([0xff, 0x00]))).toBe(255n);
	});

	it("should round-trip a value wider than 64 bits", () => {
		const value = -((1n << 200n) + 12_345n);

		expect(bigIntFromBytesLe(bigIntToBytesLe(value))).toBe(value);
	});

	it("should agree with the big-endian decoder on reversed input", () => {
		const bytes = new Uint8Array([0x01, 0x02, 0x03, 0xf4]);

		expect(bigIntFromBytesLe(bytes)).toBe(
			bigIntFromBytesBe(bytes.toReversed()),
		);
	});
});
