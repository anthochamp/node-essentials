import { decimalNormalize } from "./_normalize.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { Decimal, DecimalContext } from "./decimal-types.js";

/** `a × b`, exact before the context's rounding is applied. */
export function decimalMul(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
	context?: Readonly<DecimalContext>,
): Decimal {
	return decimalRoundToContext(
		decimalNormalize(a.coefficient * b.coefficient, a.exponent + b.exponent),
		context,
	);
}
