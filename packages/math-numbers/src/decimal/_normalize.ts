import { bigIntLog10 } from "@ac-kit/core";

import { DECIMAL_ZERO, Decimal } from "./decimal-types.js";

/**
 * Builds a canonical {@link Decimal} from a raw coefficient and exponent,
 * stripping trailing zeros so that equal values share one representation.
 */
export function decimalNormalize(
	coefficient: bigint,
	exponent: number,
): Decimal {
	if (coefficient === 0n) {
		return DECIMAL_ZERO;
	}

	const negative = coefficient < 0n;
	let magnitude = negative ? -coefficient : coefficient;
	let scale = exponent;

	while (magnitude % 10n === 0n) {
		magnitude /= 10n;
		scale++;
	}

	return {
		coefficient: negative ? -magnitude : magnitude,
		exponent: scale,
		precision: bigIntLog10(magnitude) + 1,
	};
}
