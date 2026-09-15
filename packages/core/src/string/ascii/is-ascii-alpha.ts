import { isAsciiLowerAlpha } from "./is-ascii-lower-alpha.js";
import { isAsciiUpperAlpha } from "./is-ascii-upper-alpha.js";

/**
 * Equivalent to C's `isalpha` — whether `code` is an ASCII letter (`A`-`Z` or
 * `a`-`z`).
 */
export function isAsciiAlpha(code: number): boolean {
	return isAsciiUpperAlpha(code) || isAsciiLowerAlpha(code);
}
