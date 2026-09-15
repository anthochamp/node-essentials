import { describe, expect, it } from "vitest";

import { decimalNormalize } from "./_normalize.js";
import { decimalMul } from "./decimal-mul.js";
import { decimalSqrt } from "./decimal-sqrt.js";
import { decimalToNumber } from "./decimal-to-number.js";
import {
	DECIMAL_CONTEXT_IEEE_DECIMAL128,
	DECIMAL_ZERO,
} from "./decimal-types.js";

describe("decimalSqrt", () => {
	it("finds exact roots", () => {
		expect(
			decimalToNumber(
				decimalSqrt(decimalNormalize(4n, 0), {
					precision: 20,
					roundingMode: "half-even",
				}),
			),
		).toBe(2);
		expect(
			decimalToNumber(
				decimalSqrt(decimalNormalize(144n, 0), {
					precision: 20,
					roundingMode: "half-even",
				}),
			),
		).toBe(12);
	});

	it("converges on irrational roots", () => {
		const root = decimalSqrt(
			decimalNormalize(2n, 0),
			DECIMAL_CONTEXT_IEEE_DECIMAL128,
		);

		expect(
			decimalToNumber(decimalMul(root, root, DECIMAL_CONTEXT_IEEE_DECIMAL128)),
		).toBeCloseTo(2, 12);
		expect(root.precision).toBeLessThanOrEqual(
			DECIMAL_CONTEXT_IEEE_DECIMAL128.precision,
		);
	});

	it("returns zero for zero and rejects negatives", () => {
		expect(
			decimalSqrt(DECIMAL_ZERO, { precision: 10, roundingMode: "half-even" }),
		).toBe(DECIMAL_ZERO);
		expect(() =>
			decimalSqrt(decimalNormalize(-1n, 0), {
				precision: 10,
				roundingMode: "half-even",
			}),
		).toThrow(RangeError);
	});
});
