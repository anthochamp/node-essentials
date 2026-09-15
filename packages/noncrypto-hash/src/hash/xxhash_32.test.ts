import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { xxhash_32 } from "./xxhash_32.js";

const PANGRAM = "The quick brown fox jumps over the lazy dog";
const THIRTY_TWO_BYTES = "01234567890123456789012345678901";

describe("xxhash_32", () => {
	it.each([
		["", 0, 0x02cc5d05],
		["", 1, 0x0b2cb792],
		["a", 0, 0x550d7456],
		["abc", 0, 0x32d153ff],
		["Hello, world!", 0, 0x31b7405d],
		[PANGRAM, 0, 0xe85ea4de],
		[THIRTY_TWO_BYTES, 0, 0xfa57b070],
	])(
		"should match the reference digest of %j with seed %i",
		(text, seed, expected) => {
			expect(xxhash_32(encodeTextUtf8(text), seed)).toBe(expected);
		},
	);
});
