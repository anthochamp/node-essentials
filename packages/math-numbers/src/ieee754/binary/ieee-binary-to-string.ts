import { DBL_MANT_DIG } from "@ac-kit/core";

import { decimalToString } from "../../decimal/decimal-to-string.js";
import { IeeeFormat } from "../ieee-format.js";
import { ieeeBinaryToDecimal } from "./ieee-binary-to-decimal.js";
import { ieeeBinaryToNumber } from "./ieee-binary-to-number.js";
import { ieeeBinaryToShortestDecimal } from "./ieee-binary-to-shortest-decimal.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * The canonical numeral for a binary float, spelled the way the language spells
 * one: `"NaN"`, `"Infinity"`, `"-Infinity"`, and `"0"` for either zero.
 *
 * Which numeral a finite value gets depends on whether the engine can hold it:
 *
 * - **binary16/32/64** are exactly representable as a `number`, so this is
 *   `Number.prototype.toString` — the _shortest_ numeral that round-trips.
 * - **binary128** has no engine to ask, so this is the _exact_ expansion instead,
 *   which is longer. Same number either way; a shortest-round-trip algorithm
 *   for the wide formats is planned.
 *
 * A non-decimal radix is truncated at an intrinsic digit limit either way,
 * since `Number.prototype.toString` does the same — `(0.1).toString(16)` is
 * `"0.1999999999999a"`, not an endless expansion.
 *
 * @param value The value to render.
 * @param format The format `value` is expressed in.
 * @param radix The base, from 2 to 36. Defaults to 10.
 * @returns The numeral.
 */
export function ieeeBinaryToString(
	value: IeeeBinary,
	format: IeeeFormat,
	radix?: number,
): string {
	switch (value.kind) {
		case "nan":
			return "NaN";
		case "inf":
			return value.sign === 1 ? "-Infinity" : "Infinity";
		case "zero":
			// `(-0).toString()` is `"0"`, and this follows the language.
			return "0";
		case "finite":
			break;
	}

	if (format.p <= DBL_MANT_DIG) {
		return ieeeBinaryToNumber(value, format).toString(radix);
	}

	// Shortest only means anything in base ten; elsewhere the exact expansion
	// truncated at its intrinsic limit is what the engine gives too.
	return radix === undefined || radix === 10
		? decimalToString(ieeeBinaryToShortestDecimal(value, format))
		: decimalToString(ieeeBinaryToDecimal(value, format), radix);
}
