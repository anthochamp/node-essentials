import { bigIntAbs } from "@ac-kit/core";

import { DEFAULT_ROUNDING_MODE, RoundingMode } from "../rounding-mode.js";
import { decimalNormalize } from "./_normalize.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { Decimal } from "./decimal-types.js";

/**
 * Exponential notation — one digit before the point, `fractionDigits` after,
 * and an `e±` exponent. `Number.prototype.toExponential` for a decimal that is
 * not limited to binary64, and so with no cap on the digit count.
 *
 * Omitting `fractionDigits` shows as many as the value actually has, matching
 * the language.
 *
 * @param value The decimal to render.
 * @param fractionDigits Places after the point. Defaults to the value's own.
 * @param roundingMode How to break the last digit. Defaults to `half-even`.
 * @returns The numeral.
 * @throws {RangeError} If `fractionDigits` is not a non-negative integer.
 */
export function decimalToExponential(
	value: Readonly<Decimal>,
	fractionDigits?: number,
	roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
): string {
	if (
		fractionDigits !== undefined &&
		(!Number.isInteger(fractionDigits) || fractionDigits < 0)
	) {
		throw new RangeError(
			`decimalToExponential: fractionDigits must be a non-negative integer, got ${fractionDigits}`,
		);
	}

	if (value.coefficient === 0n) {
		const zeros = fractionDigits ? `.${"0".repeat(fractionDigits)}` : "";

		return `0${zeros}e+0`;
	}

	const rounded =
		fractionDigits === undefined
			? decimalNormalize(value.coefficient, value.exponent)
			: decimalRoundToContext(value, {
					precision: fractionDigits + 1,
					roundingMode,
				});
	const sign = rounded.coefficient < 0n ? "-" : "";
	const digits = bigIntAbs(rounded.coefficient).toString();
	const exponent = rounded.exponent + digits.length - 1;
	const shown = digits.padEnd((fractionDigits ?? digits.length - 1) + 1, "0");
	const fraction = shown.length > 1 ? `.${shown.slice(1)}` : "";

	return `${sign}${shown[0]}${fraction}e${exponent < 0 ? "-" : "+"}${Math.abs(exponent)}`;
}
