import { describe, expect, it } from "vitest";

import { MASK_32 } from "../../constants/mask.js";
import { popCount32 } from "./pop-count32.js";

describe("popcount32", () => {
	it("should be 0 for 0", () => {
		expect(popCount32(0)).toBe(0);
	});

	it("should be 32 for all bits set", () => {
		expect(popCount32(MASK_32)).toBe(32);
	});

	it("should count the set bits of a mixed pattern", () => {
		expect(popCount32(0b1011)).toBe(3);
	});
});
