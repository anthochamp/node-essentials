import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { xxhash_64 } from "./xxhash_64.js";

const PANGRAM = "The quick brown fox jumps over the lazy dog";
const THIRTY_TWO_BYTES = "01234567890123456789012345678901";

describe("xxhash_64", () => {
	it.each([
		["", 0n, 0xef46db3751d8e999n],
		["", 1n, 0xd5afba1336a3be4bn],
		["a", 0n, 0xd24ec4f1a98c6e5bn],
		["abc", 0n, 0x44bc2cf5ad770999n],
		["Hello, world!", 0n, 0xf58336a78b6f9476n],
		[PANGRAM, 0n, 0x0b242d361fda71bcn],
		[THIRTY_TWO_BYTES, 0n, 0xe5cc9f411ea110ban],
	])(
		"should match the reference digest of %j with seed %i",
		(text, seed, expected) => {
			expect(xxhash_64(encodeTextUtf8(text), seed)).toBe(expected);
		},
	);
});
