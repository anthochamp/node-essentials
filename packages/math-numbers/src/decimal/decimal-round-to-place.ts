import { bigIntPow10 } from "@ac-kit/core";

import { DEFAULT_ROUNDING_MODE, RoundingMode } from "../rounding-mode.js";
import { decimalNormalize } from "./_normalize.js";
import { decimalRound } from "./_round.js";
import { Decimal } from "./decimal-types.js";

/**
 * Rounds to `fractionDigits` decimal **places**, where `decimalRoundToContext`
 * rounds to significant **digits**. `1234.5678` to two places is `1234.57`; to
 * two significant digits it is `1200`.
 *
 * A value already coarser than the target is returned unchanged rather than
 * padded — a `Decimal` carries no trailing zeros by invariant, so the padding
 * belongs to rendering.
 *
 * @param value The decimal to round.
 * @param fractionDigits Places to keep. Negative rounds above the point.
 * @param roundingMode How to break the last digit. Defaults to `half-even`.
 * @returns The rounded decimal.
 * @throws {RangeError} If `fractionDigits` is not an integer, or if
 *   `roundingMode` is `"unnecessary"` and rounding was needed.
 */
export function decimalRoundToPlace(
	value: Readonly<Decimal>,
	fractionDigits: number,
	roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
): Decimal {
	if (!Number.isInteger(fractionDigits)) {
		throw new RangeError(
			`decimalRoundToPlace: fractionDigits must be an integer, got ${fractionDigits}`,
		);
	}

	const target = -fractionDigits;

	if (value.exponent >= target) {
		return decimalNormalize(value.coefficient, value.exponent);
	}

	const divisor = bigIntPow10(target - value.exponent);

	return decimalNormalize(
		decimalRound(
			value.coefficient / divisor,
			value.coefficient % divisor,
			divisor,
			roundingMode,
		),
		target,
	);
}
