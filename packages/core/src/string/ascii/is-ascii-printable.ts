import { SPACE, TILDE } from "../../constants/ascii.js";

/**
 * Equivalent to C's `isprint` — whether `code` is an ASCII printable character:
 * the space through `~`. {@link isAsciiGraphic} is the same set without the
 * space.
 */
export function isAsciiPrintable(code: number): boolean {
	return code >= SPACE && code <= TILDE;
}
