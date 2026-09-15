import {
	DIGIT_NINE,
	DIGIT_ZERO,
	LOWERCASE_A,
	LOWERCASE_F,
	UPPERCASE_A,
	UPPERCASE_F,
} from "../../constants/ascii.js";

/**
 * Equivalent to C's `isxdigit` — whether `code` is an ASCII hexadecimal digit
 * (`0`-`9`, `A`-`F`, `a`-`f`).
 */
export function isAsciiHexDigit(code: number): boolean {
	return (
		(code >= DIGIT_ZERO && code <= DIGIT_NINE) ||
		(code >= UPPERCASE_A && code <= UPPERCASE_F) ||
		(code >= LOWERCASE_A && code <= LOWERCASE_F)
	);
}
