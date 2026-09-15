import { describe, expect, it } from "vitest";

import { decimalFromString } from "./decimal-from-string.js";
import { decimalRoundToPlace } from "./decimal-round-to-place.js";
import { decimalToExponential } from "./decimal-to-exponential.js";
import { decimalToFixed } from "./decimal-to-fixed.js";
import { decimalToPrecision } from "./decimal-to-precision.js";
import { decimalToString } from "./decimal-to-string.js";

const of = decimalFromString;

describe("decimalToFixed", () => {
	it("agrees with Number.prototype.toFixed", () => {
		for (const text of ["1234.5678", "-1234.5678", "0", "0.5", "2.5", "-2.5"]) {
			for (const places of [0, 1, 2, 5]) {
				expect(decimalToFixed(of(text), places, "half-up")).toBe(
					Number(text).toFixed(places),
				);
			}
		}
	});

	it("pads to the requested places", () => {
		expect(decimalToFixed(of("1.5"), 4)).toBe("1.5000");
		expect(decimalToFixed(of("0"), 3)).toBe("0.000");
	});

	it("keeps digits a binary64 could not", () => {
		const long = "123456789012345678901234567890.123456789";

		expect(decimalToFixed(of(long), 9)).toBe(long);
	});

	it("goes past what a binary64 could justify", () => {
		const long = "0." + "1".repeat(150);

		// oxlint-disable-next-line number-arg-out-of-range -- the throw is the point.
		expect(() => Number(1).toFixed(150)).toThrow(RangeError);
		expect(decimalToFixed(of(long), 150)).toBe(long);
	});

	it("rejects a negative or fractional place count", () => {
		expect(() => decimalToFixed(of("1"), -1)).toThrow(RangeError);
		expect(() => decimalToFixed(of("1"), 1.5)).toThrow(RangeError);
	});
});

describe("decimalToExponential", () => {
	it("agrees with Number.prototype.toExponential", () => {
		for (const text of ["1234.5678", "-1234.5678", "0.00012", "0"]) {
			for (const places of [0, 2, 6]) {
				expect(decimalToExponential(of(text), places, "half-up")).toBe(
					Number(text).toExponential(places),
				);
			}
		}
	});

	it("shows every digit when no count is given", () => {
		expect(decimalToExponential(of("1234.5"))).toBe("1.2345e+3");
		expect(decimalToExponential(of("0.00012"))).toBe("1.2e-4");
	});
});

describe("decimalToPrecision", () => {
	it("agrees with Number.prototype.toPrecision", () => {
		for (const text of ["1234.5678", "-1234.5678", "0.000001234", "0", "12"]) {
			for (const digits of [1, 3, 5, 9]) {
				expect(decimalToPrecision(of(text), digits, "half-up")).toBe(
					Number(text).toPrecision(digits),
				);
			}
		}
	});
});

describe("decimalRoundToPlace", () => {
	it("rounds to places, not to significant digits", () => {
		expect(decimalToFixed(decimalRoundToPlace(of("1234.5678"), 2), 2)).toBe(
			"1234.57",
		);
	});

	it("rounds above the point for a negative count", () => {
		expect(decimalToFixed(decimalRoundToPlace(of("1234.5678"), -2), 0)).toBe(
			"1200",
		);
	});
});

describe("decimalToString with a radix", () => {
	it("stays exact in base ten, however small the value", () => {
		for (const text of ["0.00001", "1234.5678", "-0.0009", "1e-20"]) {
			expect(decimalToString(of(text), 10)).toBe(decimalToString(of(text)));
		}

		expect(decimalToString(of("0.00001"))).toBe("0.00001");
	});

	it("matches the engine on values a binary64 holds exactly", () => {
		for (const value of [255, 0.5, 0.25, 4096.125, -17.75]) {
			for (const radix of [2, 8, 16]) {
				expect(decimalToString(of(String(value)), radix)).toBe(
					value.toString(radix),
				);
			}
		}
	});

	it("stops at as many radix digits as the value's precision justifies", () => {
		const value = of("0.333333333333333333");
		const fraction = decimalToString(value, 3).split(".")[1]!;
		// Just under 1/3, so the base-3 expansion opens with a leading zero that
		// carries no information and is not counted against the limit.
		const significant = fraction.replace(/^0+/, "");

		expect(value.precision).toBe(18);
		expect(significant.length).toBe(
			Math.ceil(value.precision * (Math.log(10) / Math.log(3))) + 1,
		);
	});

	it("is exact where the expansion terminates", () => {
		expect(decimalToString(of("0.5"), 2)).toBe("0.1");
		expect(decimalToString(of("0.0625"), 16)).toBe("0.1");
	});

	it("rejects a radix outside [2, 36]", () => {
		expect(() => decimalToString(of("1"), 1)).toThrow(RangeError);
		expect(() => decimalToString(of("1"), 37)).toThrow(RangeError);
	});
});
