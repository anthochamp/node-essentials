import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { PANGRAM, THIRTY_TWO_BYTES } from "./__fixtures__/fixtures.js";
import { murmur3_128_x64 } from "./murmur3_128_x64.js";

describe("murmur3_x64_128", () => {
	it.each([
		["", 0, "00000000000000000000000000000000"],
		["Hello, world!", 0, "df65d6d2d12d51f164c5f3a85066322c"],
		["Hello, world!", 1234, "fec60aaa640e1361561b7e086d04f951"],
		[PANGRAM, 0, "6c1b07bc7bbc4be347939ac4a93c437a"],
		[THIRTY_TWO_BYTES, 1234, "ab8faea6be3d68501d6d0bdbd568f4dc"],
	])(
		"should match the reference digest of %j with seed %i",
		(text, seed, expected) => {
			expect(murmur3_128_x64(encodeTextUtf8(text), seed).toHex()).toBe(
				expected,
			);
		},
	);
});
