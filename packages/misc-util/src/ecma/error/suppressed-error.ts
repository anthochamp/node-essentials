import type { RequiredKeysOf } from "type-fest";
import { isErrorLike } from "./error.js";

/**
 * Type alias for the built-in SuppressedError type.
 *
 * Helps clarify the code to disambugate between the SuppressedError JS class and
 * its interface (type), which have the same name, which can be confusing when
 * referring to an object that looks like an SuppressedError but is not an instance
 * of the SuppressedError class.
 */
export type ISuppressedError = SuppressedError;

/**
 * Test if value is SuppressedError-like (has name, message, error and suppressed properties)
 */
export function isSuppressedErrorLike(
	value: unknown,
): value is ISuppressedError {
	if (value instanceof SuppressedError || isErrorLike(value)) {
		const { error, suppressed } = value as Pick<
			ISuppressedError,
			RequiredKeysOf<ISuppressedError>
		>;

		return error !== undefined && suppressed !== undefined;
	}

	return false;
}
