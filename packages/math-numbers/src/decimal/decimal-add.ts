import { decimalAligned } from "./_aligned-coefficients.js";
import { decimalNormalize } from "./_normalize.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { Decimal, DecimalContext } from "./decimal-types.js";

/** `a + b`, exact before the context's rounding is applied. */
export function decimalAdd(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
	context?: Readonly<DecimalContext>,
): Decimal {
	const [left, right, exponent] = decimalAligned(a, b);

	return decimalRoundToContext(
		decimalNormalize(left + right, exponent),
		context,
	);
}
