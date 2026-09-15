/** Supported rounding methods. */
export type RoundingMethod = "round" | "floor" | "ceil" | "trunc";

/**
 * How much precision to keep, expressed one way or the other — never both, as
 * they disagree about what the digits are counted from.
 */
export type RoundOptions = {
	/** Rounding method to use. */
	roundingMethod?: RoundingMethod;
} & (
	| {
			/** Number of digits to keep after the decimal point. */
			fractionDigits?: number;
			significantDigits?: never;
	  }
	| {
			fractionDigits?: never;
			/**
			 * Number of digits to keep counting from the value's leading digit, so
			 * the precision follows its magnitude: `0.00123` to two significant
			 * digits is `0.0012` and `123456` is `120000`, which no single
			 * `fractionDigits` known in advance would give.
			 *
			 * Zero and non-finite values have no magnitude to be relative to, and are
			 * returned unchanged.
			 */
			significantDigits: number;
	  }
);

function applyRounding_(
	value: number,
	roundingMethod: RoundingMethod | undefined,
): number {
	switch (roundingMethod) {
		case "floor":
			return Math.floor(value);
		case "ceil":
			return Math.ceil(value);
		case "trunc":
			return Math.trunc(value);
		default:
			return Math.round(value);
	}
}

/**
 * Rounds a number to a given precision using the specified rounding method.
 *
 * @param value The number to round.
 * @param options Rounding options.
 * @returns The rounded number.
 */
export function round(value: number, options?: RoundOptions): number {
	const roundingMethod = options?.roundingMethod;
	const significantDigits = options?.significantDigits;

	let fractionDigits: number;
	if (significantDigits === undefined) {
		fractionDigits = options?.fractionDigits ?? 0;
	} else if (value === 0 || !Number.isFinite(value)) {
		fractionDigits = 0;
	} else {
		fractionDigits =
			significantDigits - 1 - Math.floor(Math.log10(Math.abs(value)));
	}

	if (fractionDigits === 0) {
		return applyRounding_(value, roundingMethod);
	}

	// Significant digits can ask to round above the decimal point. Scaling by an
	// exact integer power of ten and dividing keeps that exact, where
	// multiplying by an inexact negative power would not.
	if (fractionDigits < 0) {
		const factor = 10 ** -fractionDigits;

		return applyRounding_(value / factor, roundingMethod) * factor;
	}

	const factor = 10 ** fractionDigits;

	return applyRounding_(value * factor, roundingMethod) / factor;
}
