import { isAsciiAlphaNumeric } from "./is-ascii-alpha-numeric.js";
import { isAsciiGraphic } from "./is-ascii-graphic.js";

/**
 * Equivalent to C's `ispunct` — whether `code` is an ASCII punctuation or
 * symbol character: printable, visible, and neither a letter nor a digit.
 */
export function isAsciiPunctuation(code: number): boolean {
	return isAsciiGraphic(code) && !isAsciiAlphaNumeric(code);
}
