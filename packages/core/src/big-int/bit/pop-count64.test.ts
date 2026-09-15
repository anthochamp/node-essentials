import { describe, expect, it } from "vitest";

import { MASK_64N } from "../../constants/mask.js";
import { popCount64 } from "./pop-count64.js";

describe("popcount64", () => {
	it("should be 0 for 0n", () => {
		expect(popCount64(0n)).toBe(0);
	});

	it("should be 64 for all bits set", () => {
		expect(popCount64(MASK_64N)).toBe(64);
	});

	it("should count the set bits of a mixed pattern", () => {
		expect(popCount64(0xffn)).toBe(8);
	});
});
