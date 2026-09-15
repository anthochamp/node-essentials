import { Decimal } from "./decimal-types.js";

/** The nearest binary64 approximation. */
export function decimalToNumber(value: Readonly<Decimal>): number {
	return Number(`${value.coefficient}e${value.exponent}`);
}
