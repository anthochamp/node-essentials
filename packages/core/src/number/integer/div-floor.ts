import { mod } from "./mod.js";

/**
 * Flooring division — rounds toward negative infinity, and pairs with
 * {@link mod}.
 *
 * `divFloor(-7, 2) === -4`, where {@link divTrunc} gives `-3`.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function divFloor(dividend: number, divisor: number): number {
	return (dividend - mod(dividend, divisor)) / divisor;
}
