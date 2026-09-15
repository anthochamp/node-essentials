import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { murmur3_32 } from "./murmur3_32.js";

const PANGRAM = "The quick brown fox jumps over the lazy dog";
const THIRTY_TWO_BYTES = "01234567890123456789012345678901";

describe("murmur3_32", () => {
	it.each([
		["", 0, 0x00000000],
		["", 1, 0x514e28b7],
		["Hello, world!", 0, 0xc0363e43],
		["Hello, world!", 1234, 0xfaf6cdb3],
		[PANGRAM, 0, 0x2e4ff723],
		[THIRTY_TWO_BYTES, 1234, 0x3db6ec14],
	])(
		"should match the reference digest of %j with seed %i",
		(text, seed, expected) => {
			expect(murmur3_32(encodeTextUtf8(text), seed)).toBe(expected);
		},
	);
});
