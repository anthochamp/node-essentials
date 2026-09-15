import { decimalNeg } from "./decimal-neg.js";
import { Decimal } from "./decimal-types.js";

/** `|a|`. */
export function decimalAbs(value: Readonly<Decimal>): Decimal {
	return value.coefficient < 0n ? decimalNeg(value) : value;
}
