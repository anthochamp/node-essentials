import { describe, expect, it } from "vitest";

import { decimalFromNumber } from "./decimal-from-number.js";
import { decimalToNumber } from "./decimal-to-number.js";

describe("decimalFromNumber", () => {
	it("round-trips through the decimal string form", () => {
		expect(decimalToNumber(decimalFromNumber(3.14))).toBe(3.14);
		expect(decimalToNumber(decimalFromNumber(-7))).toBe(-7);
	});

	it("rejects NaN and infinities", () => {
		expect(() => decimalFromNumber(Number.NaN)).toThrow(RangeError);
		expect(() => decimalFromNumber(Number.POSITIVE_INFINITY)).toThrow(
			RangeError,
		);
	});
});
