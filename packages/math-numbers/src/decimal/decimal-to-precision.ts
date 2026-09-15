import { bigIntAbs } from "@ac-kit/core";

import { DEFAULT_ROUNDING_MODE, RoundingMode } from "../rounding-mode.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { decimalToExponential } from "./decimal-to-exponential.js";
import { decimalToFixed } from "./decimal-to-fixed.js";
import { Decimal } from "./decimal-types.js";

/**
 * `precision` significant digits, in fixed-point notation unless the exponent
 * falls outside what fixed-point reads well — the same switch
 * `Number.prototype.toPrecision` makes, at an exponent below `-6` or at or
 * above `precision`.
 *
 * Unlike `toPrecision` there is no upper cap: an arbitrary-precision decimal
 * can hold more than 100 significant digits, so it can show them.
 *
 * @param value The decimal to render.
 * @param precision Significant digits, at least one.
 * @param roundingMode How to break the last digit. Defaults to `half-even`.
 * @returns The numeral.
 * @throws {RangeError} If `precision` is not an integer of at least one.
 */
export function decimalToPrecision(
	value: Readonly<Decimal>,
	precision: number,
	roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
): string {
	if (!Number.isInteger(precision) || precision < 1) {
		throw new RangeError(
			`decimalToPrecision: precision must be an integer of at least 1, got ${precision}`,
		);
	}

	if (value.coefficient === 0n) {
		return decimalToFixed(value, precision - 1, roundingMode);
	}

	const rounded = decimalRoundToContext(value, { precision, roundingMode });
	const digits = bigIntAbs(rounded.coefficient).toString();
	const exponent = rounded.exponent + digits.length - 1;

	return exponent < -6 || exponent >= precision
		? decimalToExponential(rounded, precision - 1, roundingMode)
		: decimalToFixed(rounded, precision - 1 - exponent, roundingMode);
}
