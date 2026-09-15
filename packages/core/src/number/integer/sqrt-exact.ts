import { isqrt } from "./isqrt.js";

/**
 * Exact integer square root, or `null` when `value` is not a perfect square.
 *
 * The `number` sibling of {@link bigIntSqrtExact}.
 *
 * @throws {RangeError} When `value` is negative or not a safe integer.
 */
export function sqrtExact(value: number): number | null {
	const root = isqrt(value);

	return root * root === value ? root : null;
}
