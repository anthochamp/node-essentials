import { decimalNormalize } from "./_normalize.js";
import { Decimal } from "./decimal-types.js";

/**
 * The exact decimal denoted by a finite `number`.
 *
 * @throws {RangeError} When `value` is NaN or infinite.
 */
export function decimalFromBigInt(value: bigint): Decimal {
	return decimalNormalize(value, 0);
}
