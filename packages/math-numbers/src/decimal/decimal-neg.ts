import { DECIMAL_ZERO, Decimal } from "./decimal-types.js";

/** `−a`. */
export function decimalNeg(value: Readonly<Decimal>): Decimal {
	if (value.coefficient === 0n) {
		return DECIMAL_ZERO;
	}

	return { ...value, coefficient: -value.coefficient };
}
