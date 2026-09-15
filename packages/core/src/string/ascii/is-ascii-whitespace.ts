import { CR, HT, SPACE } from "../../constants/ascii.js";

/**
 * Equivalent to C's `isspace` — whether `code` is an ASCII whitespace
 * character: space, or one of the contiguous `HT`-`CR` (`\t`, `\n`, `\v`, `\f`,
 * `\r`) control codes.
 */
export function isAsciiWhitespace(code: number): boolean {
	return code === SPACE || (code >= HT && code <= CR);
}
