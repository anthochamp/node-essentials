import { UPPERCASE_A, UPPERCASE_Z } from "../../constants/ascii.js";

/**
 * Equivalent to C's `isupper` — whether `code` is an ASCII uppercase letter
 * (`A`-`Z`).
 */
export function isAsciiUpperAlpha(code: number): boolean {
	return code >= UPPERCASE_A && code <= UPPERCASE_Z;
}
