import { bigIntIsSafeNumber } from "../big-int/is-safe-number.js";

/**
 * Parse a numeric literal, widening to `bigint` rather than rounding.
 *
 * An integer the double range cannot hold exactly comes back as a `bigint`, so
 * no value is silently rounded; everything else comes back as a `number`, so a
 * caller only ever meets a `bigint` where it changes the answer.
 *
 * Accepts what `BigInt()` accepts — an optional sign, decimal digits, and the
 * `0b`/`0o`/`0x` prefixes — and otherwise what `Number()` accepts: a fractional
 * part, an exponent, and `Infinity`. Surrounding whitespace is ignored by both.
 * Blank text is `null` here, where `Number("")` answers `0`.
 *
 * Use this to read a number out of text a human wrote — an environment
 * variable, a config field, a CLI argument. Prefer `bigIntParse` when the value
 * must be an integer, or when the radix is known and not spelled in the text;
 * it reports a malformed input by throwing instead of by returning `null`.
 *
 * @example
 * 	```ts
 * 	parseNumberOrBigInt("42"); // 42
 * 	parseNumberOrBigInt("1.5e3"); // 1500
 * 	parseNumberOrBigInt("9007199254740993"); // 9007199254740993n
 * 	parseNumberOrBigInt("abc"); // null
 * 	```;
 *
 * @param text The text to parse.
 * @returns The number or bigint it spells, or null if it spells neither.
 */
export function parseNumberOrBigInt(text: string): number | bigint | null {
	// `BigInt("")` and `Number("")` both answer 0, which no caller means by blank.
	if (text.trim().length === 0) {
		return null;
	}

	try {
		const integer = BigInt(text);
		return bigIntIsSafeNumber(integer) ? Number(integer) : integer;
	} catch {
		const float = Number(text);
		return Number.isNaN(float) ? null : float;
	}
}
