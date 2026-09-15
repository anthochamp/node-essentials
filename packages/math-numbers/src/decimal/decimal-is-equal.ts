import { decimalCompare } from "./decimal-compare.js";
import { Decimal } from "./decimal-types.js";

/** `true` when `a` and `b` denote the same value. */
export function decimalIsEqual(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
): boolean {
	return decimalCompare(a, b) === 0;
}
