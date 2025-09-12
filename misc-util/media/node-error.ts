import type { RequiredKeysOf } from "type-fest";
import { type IError, isErrorLike } from "../../ecma/error/error.js";

/**
 * Node Error interface (error with a code property)
 */
export interface INodeError extends IError {
	/**
	 * The error code
	 *
	 * @see https://nodejs.org/api/errors.html#nodejs-error-codes
	 */
	code: string;
}

/**
 * Test if value is Node Error-like (has name, message and code properties)
 *
 * @param value The value to test
 * @returns True if the value is Node Error-like
 */
export function isNodeErrorLike(value: unknown): value is INodeError {
	if (isErrorLike(value)) {
		const { code } = value as Pick<INodeError, RequiredKeysOf<INodeError>>;

		return code !== undefined;
	}

	return false;
}

/**
 * Test if value is Node Error-like and has the specified code
 *
 * @param value The value to test
 * @param code The error code to match
 * @returns True if the value is Node Error-like and has the specified code
 */
export function isNodeErrorWithCode(value: unknown, code: string): boolean {
	return isNodeErrorLike(value) && value.code === code;
}
