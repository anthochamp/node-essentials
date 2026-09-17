import { DEL, NUL, US } from "../../constants/ascii.js";

/**
 * Equivalent to C's `iscntrl` — whether `code` is an ASCII control character:
 * `NUL` through `US`, plus `DEL`.
 */
export function isAsciiControl(code: number): boolean {
	return (code >= NUL && code <= US) || code === DEL;
}
