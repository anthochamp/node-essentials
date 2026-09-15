import { bigIntSqrt } from "./sqrt.js";

/**
 * Exact integer square root, or `null` when `value` is not a perfect square.
 *
 * @throws {RangeError} When `value` is negative.
 */
export function bigIntSqrtExact(value: bigint): bigint | null {
	const root = bigIntSqrt(value);

	return root * root === value ? root : null;
}
