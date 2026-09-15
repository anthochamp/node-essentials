import { decimalAdd } from "./decimal-add.js";
import { decimalNeg } from "./decimal-neg.js";
import { Decimal, DecimalContext } from "./decimal-types.js";

/** `a − b`. */
export function decimalSub(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
	context?: Readonly<DecimalContext>,
): Decimal {
	return decimalAdd(a, decimalNeg(b), context);
}
