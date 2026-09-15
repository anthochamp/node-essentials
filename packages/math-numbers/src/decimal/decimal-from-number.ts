import { decimalNormalize } from "./_normalize.js";
import { decimalFromString } from "./decimal-from-string.js";
import { Decimal } from "./decimal-types.js";

/**
 * The exact decimal denoted by a finite `number`.
 *
 * @throws {RangeError} When `value` is NaN or infinite.
 */
export function decimalFromNumber(value: number): Decimal {
	if (!Number.isFinite(value)) {
		throw new RangeError("decimal: cannot convert NaN or infinite number");
	}

	if (Number.isInteger(value)) {
		return decimalNormalize(BigInt(value), 0);
	}

	return decimalFromString(String(value));
}
