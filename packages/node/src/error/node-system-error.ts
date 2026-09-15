import { getSystemErrorMessage, getSystemErrorName } from "node:util";

import { isErrorLike } from "@ac-kit/core";

import type { INodeError } from "./node-error.js";

export type NodeSystemErrorInfo = {
	errno: number;
	syscall: string;
	path?: string;
	dest?: string;

	[key: string]: unknown;
};

/**
 * Node System Error interface (Error with code, errno, syscall and optional
 * path and dest properties)
 *
 * @see https://github.com/nodejs/node/blob/main/lib/internal/errors.js
 */
export interface INodeSystemError extends INodeError {
	/** The uv error context */
	info: NodeSystemErrorInfo;

	errno: number;
	syscall: string;
	path?: string;
	dest?: string;
}

/**
 * Test if value is Node System Error-like (has name, message, code, info, errno
 * and syscall properties)
 *
 * @param value The value to test
 * @returns True if the value is Node System Error-like
 */
export function isNodeSystemErrorLike(
	value: unknown,
): value is INodeSystemError {
	return (
		isErrorLike(value) &&
		"info" in value &&
		"errno" in value &&
		"syscall" in value
	);
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
 * Get the system error message (eg. no such file or directory) for a Node
 * System Error
 *
 * @param error The Node System Error
 * @returns The system error message, or undefined if not found
 */
export function getNodeSystemErrorMessage(
	error: Pick<INodeSystemError, "errno">,
): string | undefined {
	return getSystemErrorMessage(error.errno);
}
