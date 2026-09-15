import { numericConfig } from "../globals.js";
import { decimalAdd } from "./decimal-add.js";
import { decimalCompare } from "./decimal-compare.js";
import { decimalDiv } from "./decimal-div.js";
import { decimalFromNumber } from "./decimal-from-number.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { decimalToNumber } from "./decimal-to-number.js";
import {
	DECIMAL_TWO,
	DECIMAL_ZERO,
	Decimal,
	DecimalContext,
} from "./decimal-types.js";

/**
 * Principal square root, by Newton–Raphson.
 *
 * The iteration runs with extra guard digits so the final rounding sees a value
 * already correct past the requested precision.
 *
 * @throws {RangeError} When `value` is negative.
 */
export function decimalSqrt(
	value: Readonly<Decimal>,
	context: Readonly<DecimalContext> = numericConfig.defaultDecimalContext,
): Decimal {
	const precision = context.precision;

	if (value.coefficient < 0n) {
		throw new RangeError("Square root of a negative decimal is not real");
	}

	if (value.coefficient === 0n) {
		return DECIMAL_ZERO;
	}

	const digits = precision > 0 ? precision : value.precision;

	const working: DecimalContext = {
		precision: digits + 8,
		roundingMode: "half-even",
	};

	let estimate = decimalFromNumber(Math.sqrt(decimalToNumber(value)));

	// x_{n+1} = (x_n + a / x_n) / 2 — quadratic, so the digit count doubles
	// each round and the bound is generous.
	for (let step = 0; step < 120; step++) {
		const next = decimalDiv(
			decimalAdd(estimate, decimalDiv(value, estimate, working), working),
			DECIMAL_TWO,
			working,
		);

		if (decimalCompare(next, estimate) === 0) {
			break;
		}

		estimate = next;
	}

	return decimalRoundToContext(estimate, context);
}
