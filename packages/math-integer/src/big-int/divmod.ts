import { bigIntModEuclid } from "@ac-kit/core";
import { QuotientRemainder } from "@ac-kit/math-algebra";

/**
 * Euclidean division: the quotient and remainder satisfying `dividend =
 * quotient × divisor + remainder` with `0 ≤ remainder < |divisor|`.
 *
 * The quotient is derived from the remainder rather than by flooring, because
 * flooring and Euclidean division agree only when the divisor is positive.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function bigIntDivmod(
	dividend: bigint,
	divisor: bigint,
): QuotientRemainder<bigint, bigint> {
	const remainder = bigIntModEuclid(dividend, divisor);

	return { quotient: (dividend - remainder) / divisor, remainder };
}
