import { describe, expect, it } from "vitest";

import { decimalNormalize } from "./_normalize.js";
import { decimalDiv } from "./decimal-div.js";
import { decimalInv } from "./decimal-inv.js";
import { decimalToNumber } from "./decimal-to-number.js";
import { DECIMAL_ONE, DECIMAL_ZERO } from "./decimal-types.js";

describe("decimalDiv", () => {
	it("rounds a non-terminating quotient to the requested precision", () => {
		const quotient = decimalDiv(
			decimalNormalize(2n, 0),
			decimalNormalize(3n, 0),
			{ precision: 10, roundingMode: "half-even" },
		);

		expect(decimalToNumber(quotient)).toBeCloseTo(0.6666666667, 10);
		expect(quotient.precision).toBe(10);
	});

	it("stays exact when the quotient terminates", () => {
		expect(
			decimalToNumber(
				decimalDiv(decimalNormalize(1n, 0), decimalNormalize(4n, 0), {
					precision: 20,
					roundingMode: "half-even",
				}),
			),
		).toBe(0.25);
	});

	it("rejects a zero divisor", () => {
		expect(() =>
			decimalDiv(DECIMAL_ONE, DECIMAL_ZERO, {
				precision: 10,
				roundingMode: "half-even",
			}),
		).toThrow(RangeError);
	});

	it("inverts", () => {
		expect(
			decimalToNumber(
				decimalInv(decimalNormalize(8n, 0), {
					precision: 10,
					roundingMode: "half-even",
				}),
			),
		).toBe(0.125);
	});
});
