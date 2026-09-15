import { ISuppressedError } from "../types/error.js";
import { isErrorLike } from "./is-error.js";

/**
 * Test if value is SuppressedError-like (has name, message, error and
 * suppressed properties)
 */
export function isSuppressedErrorLike(
	value: unknown,
): value is ISuppressedError {
	return isErrorLike(value) && "error" in value && "suppressed" in value;
}
