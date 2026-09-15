import { isAsciiAlpha } from "./is-ascii-alpha.js";
import { isAsciiDigit } from "./is-ascii-digit.js";

/** Equivalent to C's `isalnum` — whether `code` is an ASCII letter or digit. */
export function isAsciiAlphaNumeric(code: number): boolean {
	return isAsciiAlpha(code) || isAsciiDigit(code);
}
