import { xorshift32 } from "@ac-kit/math-random";
import { describe, expect, it } from "vitest";

import { decimalToString } from "../../decimal/decimal-to-string.js";
import { IEEE_FORMAT_BINARY32, IEEE_FORMAT_BINARY64 } from "../ieee-format.js";
import { ieeeBinaryFromNumber } from "./ieee-binary-from-number.js";
import { ieeeBinaryToShortestDecimal } from "./ieee-binary-to-shortest-decimal.js";
import { IeeeBinaryFinite } from "./ieee-binary-types.js";

/** The engine's own shortest numeral, normalised away from exponent form. */
function engineShortest(value: number): string {
	return decimalToString(
		ieeeBinaryToShortestDecimal(
			ieeeBinaryFromNumber(value, IEEE_FORMAT_BINARY64) as IeeeBinaryFinite,
			IEEE_FORMAT_BINARY64,
		),
	);
}

/** Reads a numeral back through binary64, which is the round-trip under test. */
function roundTrip(numeral: string): number {
	return Number(numeral);
}

describe("ieeeBinaryToShortestDecimal", () => {
	it("gives the short numeral, not the exact expansion", () => {
		expect(engineShortest(0.1)).toBe("0.1");
		expect(engineShortest(0.3)).toBe("0.3");
		expect(engineShortest(1 / 3)).toBe("0.3333333333333333");
	});

	it("agrees with the engine across ordinary values", () => {
		for (const value of [
			1, -1, 2, 0.5, 1234.5678, -1234.5678, 1e-7, 1e21, 123456789, 0.000_001,
			9_007_199_254_740_991,
		]) {
			expect(roundTrip(engineShortest(value))).toBe(value);
			expect(Number(String(value))).toBe(value);
			expect(engineShortest(value)).toBe(
				decimalToString(
					ieeeBinaryToShortestDecimal(
						ieeeBinaryFromNumber(
							value,
							IEEE_FORMAT_BINARY64,
						) as IeeeBinaryFinite,
						IEEE_FORMAT_BINARY64,
					),
				),
			);
		}
	});

	it("round-trips the extremes, where the bracket is asymmetric", () => {
		for (const value of [
			Number.MAX_VALUE,
			Number.MIN_VALUE,
			Number.EPSILON,
			2 ** 52,
			2 ** -1022,
			5e-324,
		]) {
			expect(roundTrip(engineShortest(value))).toBe(value);
		}
	});

	it("is never longer than the engine's own numeral", () => {
		const random = xorshift32(12345);
		const view = new DataView(new ArrayBuffer(8));

		for (let index = 0; index < 2000; index++) {
			view.setUint32(0, random() * 2 ** 32, true);
			view.setUint32(4, random() * 2 ** 32, true);

			const candidate = view.getFloat64(0, true);

			if (!Number.isFinite(candidate) || candidate === 0) {
				continue;
			}

			const ours = engineShortest(candidate);

			expect(roundTrip(ours)).toBe(candidate);
			expect(digitsOf(ours).length).toBeLessThanOrEqual(
				digitsOf(String(candidate)).length,
			);
		}
	});

	it("round-trips every binary32 it is given", () => {
		const random = xorshift32(67890);

		for (let index = 0; index < 500; index++) {
			const candidate = Math.fround(
				random() * 2 ** Math.trunc(random() * 40 - 20),
			);

			if (candidate === 0 || !Number.isFinite(candidate)) {
				continue;
			}

			const numeral = decimalToString(
				ieeeBinaryToShortestDecimal(
					ieeeBinaryFromNumber(
						candidate,
						IEEE_FORMAT_BINARY32,
					) as IeeeBinaryFinite,
					IEEE_FORMAT_BINARY32,
				),
			);

			expect(Math.fround(Number(numeral))).toBe(candidate);
		}
	});
});

/** Significant digits only, so exponent form and sign do not skew the count. */
function digitsOf(numeral: string): string {
	return numeral.replace(/[-+.]|e.*$/g, "").replace(/^0+|0+$/g, "");
}
