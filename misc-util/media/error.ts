import type { RequiredKeysOf } from "type-fest";
import { isObject } from "../is-object.js";

/**
 * Type alias for the built-in Error type.
 *
 * Helps clarify the code to disambugate between the Error JS class and its
 * interface (type), which have the same name, which can be confusing when
 * referring to an object that looks like an Error but is not an instance
 * of the Error class.
 */
export type IError = Error;

/**
 * Test if value is Error-like (has name and message properties)
 */
export function isErrorLike(value: unknown): value is IError {
	if (value instanceof Error || isObject(value)) {
		const { name, message } = value as Pick<IError, RequiredKeysOf<IError>>;

		return name !== undefined && message !== undefined;
	}

	return false;
}
