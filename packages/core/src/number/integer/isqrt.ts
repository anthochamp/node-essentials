import { bigIntSqrt } from "../../big-int/sqrt.js";

/**
 * Floor of the integer square root: the largest `r` with `r² ≤ value`.
 *
 * The `number` sibling of {@link bigIntSqrt}, completing `Math.sqrt`. Seeded
 * from `Math.sqrt`, which is correctly rounded and so is off by at most one;
 * past 2⁵² the correction cannot be checked by squaring in `number` arithmetic,
 * so those values are settled on the `bigint` path.
 *
 * @throws {RangeError} When `value` is negative or not a safe integer.
 */
export function isqrt(value: number): number {
	if (!Number.isSafeInteger(value)) {
		throw new RangeError("Value must be a safe integer");
	}

	if (value < 0) {
		throw new RangeError("Square root of a negative integer is not real");
	}

	if (value > 2 ** 52) {
		return Number(bigIntSqrt(BigInt(value)));
	}

	const root = Math.floor(Math.sqrt(value));

	return root * root > value ? root - 1 : root;
}
