import {
	HYPHEN_MINUS,
	PLUS,
	SLASH,
	UNDERSCORE,
} from "../../constants/ascii.js";
import { isAsciiAlphaNumeric } from "./is-ascii-alpha-numeric.js";

/**
 * Whether `code` is a character of the base64 or base64url alphabet (RFC 4648
 * §4/§5: `A`-`Z`, `a`-`z`, `0`-`9`, plus either `+`/`/` (base64) or `-`/`_`
 * (base64url) — never padding (`=`)).
 *
 * Accepts both alphabets' extra characters at once: the two alphabets only
 * differ in those two symbols, so a caller that needs to tell them apart (e.g.
 * to detect which one a string uses) should test for `+`/`/` and `-`/`_`
 * directly rather than relying on this predicate alone.
 */
export function isAsciiBase64Char(code: number): boolean {
	return (
		isAsciiAlphaNumeric(code) ||
		code === PLUS ||
		code === SLASH ||
		code === HYPHEN_MINUS ||
		code === UNDERSCORE
	);
}
