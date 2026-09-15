import { limb32ToBigInt } from "@ac-kit/math-integer";

import { decimalNormalize } from "../../decimal/_normalize.js";
import { Decimal } from "../../decimal/decimal-types.js";
import { IeeeFormat } from "../ieee-format.js";
import { IeeeBinaryFinite } from "./ieee-binary-types.js";

/**
 * The **shortest** decimal that reads back as exactly this binary float — the
 * numeral `Number.prototype.toString` produces, generalised to any format
 * width.
 *
 * `ieeeBinaryToDecimal` gives the exact expansion, which for binary64's `0.1`
 * is 55 digits; this gives `0.1`, because no shorter numeral and no other
 * 1-digit numeral rounds back to the same value. Both denote the same float,
 * but only this one is what a reader expects to see.
 *
 * Steele and White's free-format algorithm (the "Dragon4" family), run on exact
 * `bigint` rationals: the value is bracketed by the midpoints to its two
 * neighbours, digits are generated most-significant first, and generation stops
 * as soon as the numeral is unambiguously inside that bracket. Ryū computes the
 * same digits from precomputed power-of-ten tables, which is faster but needs a
 * table per format; exact arithmetic needs none and is the right trade for a
 * path that is not hot.
 *
 * The bracket is asymmetric at a power of two, where the gap below is half the
 * gap above, and the low end is inclusive only for an even significand — the
 * two details that decide whether `5e-324` prints as itself or as `5.0e-324`.
 *
 * O(d) big-integer operations for `d` digits produced, each on numbers of the
 * value's own width.
 *
 * @param value A finite, non-zero value in the unpacked pseudo-normal form.
 * @param format The format `value` is expressed in.
 * @returns The shortest round-tripping decimal.
 */
export function ieeeBinaryToShortestDecimal(
	value: IeeeBinaryFinite,
	format: IeeeFormat,
): Decimal {
	const significand =
		typeof value.sig === "bigint" ? value.sig : limb32ToBigInt(value.sig);
	const exponent = value.exp - (format.p - 1);
	const isSmallestNormalOrPowerOfTwo =
		significand === 1n << BigInt(format.p - 1);
	const acceptBounds = significand % 2n === 0n;

	// numerator / denominator is the value; plus / minus are the half-gaps to
	// the neighbours, scaled the same way.
	let numerator: bigint;
	let denominator: bigint;
	let plus: bigint;
	let minus: bigint;

	if (exponent >= 0) {
		const scale = 1n << BigInt(exponent);

		numerator = significand * scale * 2n;
		denominator = 2n;
		plus = scale;
		minus = scale;
	} else {
		numerator = significand * 2n;
		denominator = 1n << BigInt(-exponent + 1);
		plus = 1n;
		minus = 1n;
	}

	if (isSmallestNormalOrPowerOfTwo && value.exp > lowestExponent_(format)) {
		// Below a power of two the neighbours are half as far apart, so the whole
		// bracket is doubled to keep one scale for both ends.
		numerator *= 2n;
		denominator *= 2n;
		plus *= 2n;
	}

	const digits: number[] = [];
	let decimalExponent = 0;

	// Bring the value into [0.1, 1) in decimal terms, so the first digit emitted
	// is the first significant one.
	while (numerator < denominator) {
		numerator *= 10n;
		plus *= 10n;
		minus *= 10n;
		decimalExponent--;
	}

	while (numerator >= denominator * 10n) {
		denominator *= 10n;
		decimalExponent++;
	}

	for (;;) {
		numerator *= 10n;
		plus *= 10n;
		minus *= 10n;

		const digit = Number(numerator / denominator);

		numerator %= denominator;

		const belowLow = acceptBounds ? numerator <= minus : numerator < minus;
		const aboveHigh = acceptBounds
			? numerator + plus >= denominator
			: numerator + plus > denominator;

		if (belowLow || aboveHigh) {
			// Both ends reachable: take whichever neighbour is nearer.
			digits.push(
				belowLow && aboveHigh
					? numerator * 2n >= denominator
						? digit + 1
						: digit
					: belowLow
						? digit
						: digit + 1,
			);
			break;
		}

		digits.push(digit);
	}

	const coefficient = BigInt(digits.join(""));
	const magnitude = value.sign === 1 ? -coefficient : coefficient;

	return decimalNormalize(magnitude, decimalExponent - digits.length);
}

/** The unbiased exponent of the smallest normal, below which gaps stay even. */
function lowestExponent_(format: IeeeFormat): number {
	return 1 - format.emax;
}
