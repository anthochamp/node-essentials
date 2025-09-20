import { getSystemErrorMessage, getSystemErrorName } from "node:util";
import type { RequiredKeysOf } from "type-fest";
import { isErrorLike } from "../../ecma/error/error.js";
import type { INodeError } from "./node-error.js";

export type NodeSystemErrorInfo = {
	errno: number;
	syscall: string;
	path?: string;
	dest?: string;

	[key: string]: unknown;
};

/**
 * Node System Error interface (Error with code, errno, syscall and optional path and dest properties)
 *
 * @see https://github.com/nodejs/node/blob/main/lib/internal/errors.js
 */
export interface INodeSystemError extends INodeError {
	/**
	 * The uv error context
	 */
	info: NodeSystemErrorInfo;

	errno: number;
	syscall: string;
	path?: string;
	dest?: string;
}

/**
 * Test if value is Node System Error-like (has name, message, code, info, errno and syscall properties)
 *
 * @param value The value to test
 * @returns True if the value is Node System Error-like
 */
export function isNodeSystemErrorLike(
	value: unknown,
): value is INodeSystemError {
	if (isErrorLike(value)) {
		const { info, errno, syscall } = value as Pick<
			INodeSystemError,
			RequiredKeysOf<INodeSystemError>
		>;

		return info !== undefined && errno !== undefined && syscall !== undefined;
	}

	return false;
}

/**
 * Get the system error name (eg. ENOENT) for a Node System Error
 *
 * @param error The Node System Error
 * @returns The system error name, or undefined if not found
 */
export function getNodeSystemErrorName(
	error: Pick<INodeSystemError, "errno">,
): string | undefined {
	return getSystemErrorName(error.errno);
}

/**
 * Get the system error message (eg. no such file or directory) for a Node System Error
 *
 * @param error The Node System Error
 * @returns The system error message, or undefined if not found
 */
export function getNodeSystemErrorMessage(
	error: Pick<INodeSystemError, "errno">,
): string | undefined {
	return getSystemErrorMessage(error.errno);
}
