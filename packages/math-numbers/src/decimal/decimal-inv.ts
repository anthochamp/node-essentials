import { decimalDiv } from "./decimal-div.js";
import { DECIMAL_ONE, Decimal, DecimalContext } from "./decimal-types.js";

/** `1 ÷ a`. */
export function decimalInv(
	value: Readonly<Decimal>,
	context?: Readonly<DecimalContext>,
): Decimal {
	return decimalDiv(DECIMAL_ONE, value, context);
}
