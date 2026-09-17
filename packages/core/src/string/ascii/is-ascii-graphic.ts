import { EXCLAMATION_MARK, TILDE } from "../../constants/ascii.js";

/**
 * Equivalent to C's `isgraph` — whether `code` is an ASCII character with a
 * visible glyph: `!` through `~`, which is every printable character except the
 * space.
 */
export function isAsciiGraphic(code: number): boolean {
	return code >= EXCLAMATION_MARK && code <= TILDE;
}
