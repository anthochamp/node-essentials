import { bigIntDividesPowerOf } from "@ac-kit/math-integer";

import { rationalReduce } from "./rational-reduce.js";
import { Rational } from "./rational-types.js";

/**
 * Decimal places in the exact expansion, or `Infinity` when it never terminates
 * — which happens exactly when the reduced denominator has a prime factor that
 * ten does not.
 *
 * Where it does terminate the count is `max(v₂, v₅)` of the denominator, not
 * their sum: scaling by a power of ten supplies a two and a five at once, so
 * the scarcer factor rides along with the other rather than costing a place of
 * its own. `3/50` is `0.06` — two places, from `2¹·5²`, not three.
 *
 * @param value The rational to measure.
 * @returns The place count, or `Infinity`.
 */
export function rationalFractionalPrecision(value: Readonly<Rational>): number {
	if (value.denominator === 1n) {
		return 0;
	}

	const reduced = rationalReduce(value);

	if (!bigIntDividesPowerOf(reduced.denominator, 10n)) {
		return Number.POSITIVE_INFINITY;
	}

	let twos = 0;
	let fives = 0;
	let remaining = reduced.denominator;

	while (remaining % 2n === 0n) {
		remaining /= 2n;
		twos++;
	}

	while (remaining % 5n === 0n) {
		remaining /= 5n;
		fives++;
	}

	return Math.max(twos, fives);
}
