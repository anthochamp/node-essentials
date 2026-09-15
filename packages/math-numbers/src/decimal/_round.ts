import { bigIntAbs } from "@ac-kit/core";

import { RoundingMode } from "../rounding-mode.js";

/**
 * Rounds the quotient `quotient` of `dividend / divisor`, given the remainder,
 * according to `mode`.
 *
 * @throws {RangeError} When `mode` is `"unnecessary"` and the remainder is
 *   non-zero.
 */
export function decimalRound(
	quotient: bigint,
	remainder: bigint,
	divisor: bigint,
	mode: RoundingMode,
): bigint {
	if (remainder === 0n) {
		return quotient;
	}

	const negative = remainder < 0n !== divisor < 0n;
	const magnitude = bigIntAbs(remainder);
	const divisorMagnitude = bigIntAbs(divisor);
	const twiceRemainder = 2n * magnitude;
	const positive = quotient >= 0n;
	const awayFromZero = positive ? quotient + 1n : quotient - 1n;

	switch (mode) {
		case "floor":
			return negative ? quotient - 1n : quotient;
		case "ceiling":
			return negative ? quotient : quotient + 1n;
		case "down":
			return quotient;
		case "up":
			return awayFromZero;
		case "half-up":
			return twiceRemainder >= divisorMagnitude ? awayFromZero : quotient;
		case "half-down":
			return twiceRemainder > divisorMagnitude ? awayFromZero : quotient;
		case "half-odd":
			if (twiceRemainder === divisorMagnitude) {
				return quotient % 2n === 0n ? awayFromZero : quotient;
			}

			return twiceRemainder > divisorMagnitude ? awayFromZero : quotient;
		case "half-ceiling":
			// The quotient truncates toward zero, so for a negative value the
			// ceiling is the quotient itself and the floor is one below it.
			if (twiceRemainder === divisorMagnitude) {
				return negative ? quotient : quotient + 1n;
			}

			return twiceRemainder > divisorMagnitude ? awayFromZero : quotient;
		case "half-floor":
			if (twiceRemainder === divisorMagnitude) {
				return negative ? quotient - 1n : quotient;
			}

			return twiceRemainder > divisorMagnitude ? awayFromZero : quotient;
		case "half-even":
			// half-even, and the fallback for any mode not listed above.
			if (twiceRemainder < divisorMagnitude) {
				return quotient;
			}

			if (twiceRemainder > divisorMagnitude) {
				return awayFromZero;
			}

			return quotient % 2n === 0n ? quotient : awayFromZero;

		case "unnecessary":
			throw new RangeError(
				"RoundingMode 'unnecessary': rounding is needed but was not allowed",
			);
	}
}
