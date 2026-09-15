import { ByteReader } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { VarintIncompleteError, VarintMalformedError } from "../errors.js";
import { decodeBigVlq } from "./decode-big-vlq.js";
import { decodeVlq } from "./decode-vlq.js";
import { encodeBigVlq } from "./encode-big-vlq.js";
import { encodeVlq } from "./encode-vlq.js";
import { readBigVlq } from "./read-big-vlq.js";
import { readVlq } from "./read-vlq.js";
import { vlqByteLength } from "./vlq-byte-length.js";
import { writeVlq } from "./write-vlq.js";

/** X.690 §8.19.2 and Standard MIDI File examples. */
const KNOWN_VECTORS: readonly (readonly [number, readonly number[]])[] = [
	[0, [0x00]],
	[1, [0x01]],
	[127, [0x7f]],
	[128, [0x81, 0x00]],
	[255, [0x81, 0x7f]],
	[300, [0x82, 0x2c]],
	[16_383, [0xff, 0x7f]],
	[16_384, [0x81, 0x80, 0x00]],
	[2_097_151, [0xff, 0xff, 0x7f]],
	[2_097_152, [0x81, 0x80, 0x80, 0x00]],
];

describe("encodeVlq", () => {
	it("should match the known vectors", () => {
		for (const [value, bytes] of KNOWN_VECTORS) {
			expect([...encodeVlq(value)]).toStrictEqual([...bytes]);
		}
	});

	it("should encode zero as a single zero byte", () => {
		expect([...encodeVlq(0)]).toStrictEqual([0x00]);
	});

	it("should encode Number.MAX_SAFE_INTEGER", () => {
		expect([...encodeVlq(Number.MAX_SAFE_INTEGER)]).toStrictEqual([
			0x8f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f,
		]);
	});

	it("should reject a negative value", () => {
		expect(() => encodeVlq(-1)).toThrow(RangeError);
	});

	it("should reject a fractional value", () => {
		expect(() => encodeVlq(1.5)).toThrow(RangeError);
	});

	it("should reject a value beyond the safe integer range", () => {
		expect(() => encodeVlq(2 ** 53)).toThrow(RangeError);
	});
});

describe("vlqByteLength", () => {
	it("should agree with what encodeVlq produces", () => {
		for (const [value] of KNOWN_VECTORS) {
			expect(vlqByteLength(value)).toBe(encodeVlq(value).length);
		}
	});

	it("should be 1 for every value below the radix", () => {
		expect(vlqByteLength(0)).toBe(1);
		expect(vlqByteLength(127)).toBe(1);
		expect(vlqByteLength(128)).toBe(2);
	});
});

describe("writeVlq", () => {
	it("should return the offset past what it wrote", () => {
		const target = new Uint8Array(4);

		expect(writeVlq(target, 1, 300)).toBe(3);
		expect([...target]).toStrictEqual([0x00, 0x82, 0x2c, 0x00]);
	});

	it("should reject a target too short to hold the value", () => {
		expect(() => writeVlq(new Uint8Array(1), 0, 300)).toThrow(RangeError);
	});

	it("should reject a negative offset", () => {
		expect(() => writeVlq(new Uint8Array(4), -1, 1)).toThrow(RangeError);
	});
});

describe("readVlq", () => {
	it("should round-trip every known vector", () => {
		for (const [value] of KNOWN_VECTORS) {
			expect(readVlq(new ByteReader(encodeVlq(value)))).toBe(value);
		}
	});

	it("should round-trip Number.MAX_SAFE_INTEGER", () => {
		const encoded = encodeVlq(Number.MAX_SAFE_INTEGER);

		expect(readVlq(new ByteReader(encoded))).toBe(Number.MAX_SAFE_INTEGER);
	});

	it("should decode values above 2^28, which a 32-bit shift cannot hold", () => {
		for (const value of [2 ** 28, 2 ** 32, 2 ** 40, 2 ** 53 - 1]) {
			expect(readVlq(new ByteReader(encodeVlq(value)))).toBe(value);
		}
	});

	it("should advance the cursor past exactly the bytes consumed", () => {
		const reader = new ByteReader(
			new Uint8Array([0x82, 0x2c, 0x01, 0xff, 0xff]),
		);

		expect(readVlq(reader)).toBe(300);
		expect(reader.position).toBe(2);
		expect(readVlq(reader)).toBe(1);
		expect(reader.position).toBe(3);
	});

	it("should reject an overlong encoding", () => {
		expect(() => readVlq(new ByteReader(new Uint8Array([0x80, 0x01])))).toThrow(
			VarintMalformedError,
		);
	});

	it("should report a truncated sequence as incomplete", () => {
		expect(() => readVlq(new ByteReader(new Uint8Array([0x82])))).toThrow(
			VarintIncompleteError,
		);
	});

	it("should report an empty input as incomplete", () => {
		expect(() => readVlq(new ByteReader(new Uint8Array(0)))).toThrow(
			VarintIncompleteError,
		);
	});

	it("should reject a value too large for a number, pointing at readBigVlq", () => {
		const tooLarge = new Uint8Array([
			0x81, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x00,
		]);

		expect(() => readVlq(new ByteReader(tooLarge))).toThrow(RangeError);
	});
});

describe("encodeBigVlq", () => {
	it("should agree with encodeVlq over the range they share", () => {
		for (const [value] of KNOWN_VECTORS) {
			expect([...encodeBigVlq(BigInt(value))]).toStrictEqual([
				...encodeVlq(value),
			]);
		}
	});

	it("should reject a negative value", () => {
		expect(() => encodeBigVlq(-1n)).toThrow(RangeError);
	});
});

describe("readBigVlq", () => {
	it("should round-trip an arc far beyond Number.MAX_SAFE_INTEGER", () => {
		// X.660 caps no arc, so this is a well-formed subidentifier that `number`
		// simply cannot hold.
		const huge = (1n << 200n) + 12_345n;

		expect(readBigVlq(new ByteReader(encodeBigVlq(huge)))).toBe(huge);
	});

	it("should read what readVlq refuses", () => {
		const tooLarge = new Uint8Array([
			0x81, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x00,
		]);

		expect(readBigVlq(new ByteReader(tooLarge))).toBe(1n << 56n);
	});

	it("should reject an overlong encoding", () => {
		expect(() =>
			readBigVlq(new ByteReader(new Uint8Array([0x80, 0x01]))),
		).toThrow(VarintMalformedError);
	});

	it("should report a truncated sequence as incomplete", () => {
		expect(() => readBigVlq(new ByteReader(new Uint8Array([0x82])))).toThrow(
			VarintIncompleteError,
		);
	});
});

describe("decodeVlq", () => {
	it("should decode a buffer holding exactly one value", () => {
		expect(decodeVlq(new Uint8Array([0x82, 0x2c]))).toBe(300);
	});

	it("should reject trailing bytes", () => {
		expect(() => decodeVlq(new Uint8Array([0x01, 0x02]))).toThrow(
			VarintMalformedError,
		);
	});
});

describe("decodeBigVlq", () => {
	it("should decode a buffer holding exactly one value", () => {
		expect(decodeBigVlq(new Uint8Array([0x82, 0x2c]))).toBe(300n);
	});

	it("should reject trailing bytes", () => {
		expect(() => decodeBigVlq(new Uint8Array([0x01, 0x02]))).toThrow(
			VarintMalformedError,
		);
	});
});
