import { rationalReduce } from "./rational-reduce.js";
import { Rational } from "./rational-types.js";

/**
 * The best rational approximation of `value` with a denominator no larger than
 * `maxDenominator`, by the Stern–Brocot / continued-fraction expansion.
 *
 * @throws {RangeError} When `value` is not finite, or `maxDenominator` is less
 *   than one.
 */
export function rationalFromNumber(
	value: number,
	maxDenominator = 1n << 53n,
): Rational {
	if (!Number.isFinite(value)) {
		throw new RangeError("Cannot express a non-finite number as a rational");
	}

	if (maxDenominator < 1n) {
		throw new RangeError("maxDenominator must be at least one");
	}

	if (Number.isInteger(value)) {
		return { numerator: BigInt(value), denominator: 1n, reduced: true };
	}

	const negative = value < 0;
	let remainder = Math.abs(value);

	// Continued-fraction convergents: each step keeps the best approximation
	// seen so far, so the loop can stop the moment the bound is exceeded.
	let prevNum = 0n;
	let prevDen = 1n;
	let num = 1n;
	let den = 0n;

	for (let step = 0; step < 64; step++) {
		const whole = Math.floor(remainder);
		const wholeBig = BigInt(whole);
		const nextNum = wholeBig * num + prevNum;
		const nextDen = wholeBig * den + prevDen;

		if (nextDen > maxDenominator) {
			break;
		}

		prevNum = num;
		prevDen = den;
		num = nextNum;
		den = nextDen;

		const fraction = remainder - whole;

		if (fraction === 0) {
			break;
		}

		remainder = 1 / fraction;
	}

	return rationalReduce({
		numerator: negative ? -num : num,
		denominator: den,
		reduced: false,
	});
}
