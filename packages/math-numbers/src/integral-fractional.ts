/**
 * Decomposition of a real number into its sign, integral part and fractional
 * digits, without loss:
 *
 *     value = s × (i + f × 10^−fracDigits)
 *
 * This is the **positional** view of a decimal: the digits either side of the
 * point, exactly as written. `Decimal`'s `{ coefficient, exponent }` is the
 * **scaled-integer** view of the same number — better for arithmetic, since
 * adding two of those is one integer add plus exponent bookkeeping. Neither
 * replaces the other; convert with `DecimalNum.toIntegralFractional`.
 *
 * `fracDigits` is carried rather than derived from `f`, because `f` alone
 * cannot tell `0.7` from `0.007` — both have `f = 7n`. It is also what
 * preserves trailing zeros, so `1.50` decomposes with `fracDigits: 2` and keeps
 * its two decimal places.
 *
 * @example
 * 	```ts
 * 	// −123.4560 → { s: -1, i: 123n, f: 4560n, fracDigits: 4 }
 * 	// 0.007     → { s:  1, i:   0n, f:    7n, fracDigits: 3 }
 * 	// 42        → { s:  1, i:  42n, f:    0n, fracDigits: 0 }
 * 	```;
 */
export type IntegralFractional = {
	/** Sign of the number: `-1` or `+1`. By convention, zero uses `s = 1`. */
	s: -1 | 1;
	/** Non-negative integral part — the digits before the decimal point. */
	i: bigint;
	/** Non-negative fractional digits, read as `f × 10^−fracDigits`. */
	f: bigint;
	/** How many decimal places `f` occupies, including any leading zeros. */
	fracDigits: number;
};

const NUMERAL_ = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Parses a decimal numeral into its {@link IntegralFractional} decomposition.
 *
 * Accepts an optional sign, an optional exponent, and a point on either side of
 * the digits (`.5` and `5.` both parse). The exponent is applied by moving the
 * point, so `1e-7` yields seven decimal places rather than none — a plain
 * string scan of the printed form would miss that.
 *
 * Trailing zeros are preserved: `"1.50"` gives `fracDigits: 2`, so a numeral's
 * own precision survives the round trip through
 * {@link integralFractionalToString}.
 *
 * @param text The numeral to read. Surrounding whitespace is ignored.
 * @returns The decomposition.
 * @throws {SyntaxError} If `text` is not a decimal numeral. `NaN` and `±∞` are
 *   not, having no decomposition.
 */
export function integralFractionalFromString(text: string): IntegralFractional {
	const trimmed = text.trim();

	if (!NUMERAL_.test(trimmed)) {
		throw new SyntaxError(
			`integralFractionalFromString: ${JSON.stringify(text)} is not a decimal numeral`,
		);
	}

	const negative = trimmed.startsWith("-");
	const unsigned =
		negative || trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
	const exponentIndex = unsigned.search(/[eE]/);
	const mantissa =
		exponentIndex === -1 ? unsigned : unsigned.slice(0, exponentIndex);
	const exponent =
		exponentIndex === -1 ? 0 : Number(unsigned.slice(exponentIndex + 1));

	const pointIndex = mantissa.indexOf(".");
	const digits =
		pointIndex === -1
			? mantissa
			: mantissa.slice(0, pointIndex) + mantissa.slice(pointIndex + 1);
	const point = (pointIndex === -1 ? mantissa.length : pointIndex) + exponent;

	let integer: string;
	let fraction: string;

	if (point <= 0) {
		integer = "0";
		fraction = "0".repeat(-point) + digits;
	} else if (point >= digits.length) {
		integer = digits + "0".repeat(point - digits.length);
		fraction = "";
	} else {
		integer = digits.slice(0, point);
		fraction = digits.slice(point);
	}

	return {
		s: negative ? -1 : 1,
		i: integer === "" ? 0n : BigInt(integer),
		f: fraction === "" ? 0n : BigInt(fraction),
		fracDigits: fraction.length,
	};
}

/**
 * Decomposes a `number` through its shortest round-tripping decimal form — the
 * one `String(value)` produces — so the result is the numeral a reader would
 * see, not the exact binary expansion behind it.
 *
 * @param value The number to decompose.
 * @returns The decomposition.
 * @throws {RangeError} If `value` is `NaN` or infinite.
 */
export function integralFractionalFromNumber(
	value: number,
): IntegralFractional {
	if (!Number.isFinite(value)) {
		throw new RangeError(
			`integralFractionalFromNumber: ${value} has no decomposition`,
		);
	}

	return integralFractionalFromString(String(value));
}

/**
 * Serialises a decomposition back to a decimal numeral, in plain positional
 * notation with no exponent.
 *
 * @param value The decomposition.
 * @returns The numeral, with `fracDigits` decimal places when there are any.
 */
export function integralFractionalToString(value: IntegralFractional): string {
	const sign = value.s === -1 ? "-" : "";

	if (value.fracDigits === 0) {
		return sign + String(value.i);
	}

	const fraction = String(value.f).padStart(value.fracDigits, "0");

	return `${sign}${String(value.i)}.${fraction}`;
}

/**
 * Number of decimal digits in the integral part. Always at least `1`, since a
 * zero integral part still reads as the digit `0`.
 */
export function integralFractionalIntegralPrecision(
	value: IntegralFractional,
): number {
	return String(value.i).length;
}

/** Number of decimal places, counting leading and trailing zeros. */
export function integralFractionalFracPrecision(
	value: IntegralFractional,
): number {
	return value.fracDigits;
}

/**
 * Number of significant decimal digits — everything from the first non-zero
 * digit to the last, either side of the point. `0` has one significant digit.
 */
export function integralFractionalPrecision(value: IntegralFractional): number {
	const digits =
		String(value.i) + String(value.f).padStart(value.fracDigits, "0");
	const first = digits.search(/[1-9]/);

	if (first === -1) {
		return 1;
	}

	let last = digits.length - 1;

	while (digits[last] === "0") {
		last--;
	}

	return last - first + 1;
}
