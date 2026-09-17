import { HT, SPACE } from "../../constants/ascii.js";

/**
 * Equivalent to C's `isblank` — whether `code` is a space or a horizontal tab.
 *
 * The two characters that separate words on one line, as against
 * {@link isAsciiWhitespace}, which also holds the line terminators.
 */
export function isAsciiBlank(code: number): boolean {
	return code === SPACE || code === HT;
}
