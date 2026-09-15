import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { PANGRAM, THIRTY_TWO_BYTES } from "./__fixtures__/fixtures.js";
import { murmur3_128_x86 } from "./murmur3_128_x86.js";

describe("murmur3_x86_128", () => {
	it.each([
		["", 0, "00000000000000000000000000000000"],
		["Hello, world!", 0, "a7dbac26fc8d63f063422b40c3d4fd0a"],
		["Hello, world!", 1234, "0945e7f97bc156c7d9b7fe35ffcdd907"],
		[PANGRAM, 0, "c383152f672ceeec6cf67b5d2c1de9e5"],
		[THIRTY_TWO_BYTES, 1234, "88474a7295dc566441c20b85bfa927a5"],
	])(
		"should match the reference digest of %j with seed %i",
		(text, seed, expected) => {
			expect(murmur3_128_x86(encodeTextUtf8(text), seed).toHex()).toBe(
				expected,
			);
		},
	);

	it("should produce a 16-byte digest", () => {
		expect(murmur3_128_x86(encodeTextUtf8(PANGRAM))).toHaveLength(16);
	});
});
