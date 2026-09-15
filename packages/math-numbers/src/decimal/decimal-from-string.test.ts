import { describe, expect, it } from "vitest";

import { decimalFromString } from "./decimal-from-string.js";
import { decimalToNumber } from "./decimal-to-number.js";

describe("decimalFromString", () => {
	it("reads plain, signed and scientific notation", () => {
		expect(decimalToNumber(decimalFromString("3.14"))).toBe(3.14);
		expect(decimalToNumber(decimalFromString("-0.001"))).toBe(-0.001);
		expect(decimalToNumber(decimalFromString("1.23e5"))).toBe(123000);
		expect(decimalToNumber(decimalFromString("+2"))).toBe(2);
	});

	it("rejects malformed input", () => {
		expect(() => decimalFromString("1.2.3")).toThrow(SyntaxError);
		expect(() => decimalFromString("abc")).toThrow(SyntaxError);
		expect(() => decimalFromString("")).toThrow(SyntaxError);
	});
});
