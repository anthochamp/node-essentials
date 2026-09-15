import { LOWERCASE_A, LOWERCASE_Z } from "../../constants/ascii.js";

/**
 * Equivalent to C's `islower` — whether `code` is an ASCII lowercase letter
 * (`a`-`z`).
 */
export function isAsciiLowerAlpha(code: number): boolean {
	return code >= LOWERCASE_A && code <= LOWERCASE_Z;
}
