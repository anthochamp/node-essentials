import { isErrorLike, type IError } from "@ac-kit/core";

/**
 * Error object representing a failed execution of a child process using
 * `child_process.exec` or `child_process.execFile`.
 */
export interface INodeExecError extends IError {
	code: string | number;
	killed: boolean;
	signal: NodeJS.Signals | null;
	cmd: string;
	stdout: string | Buffer;
	stderr: string | Buffer;
}

/**
 * Check if a value is a INodeExecError-like object.
 *
 * @param value The value to test
 * @returns True if the value is a INodeExecError-like object
 */
export function isNodeExecErrorLike(value: unknown): value is INodeExecError {
	return (
		isErrorLike(value) &&
		"code" in value &&
		"killed" in value &&
		"signal" in value &&
		"cmd" in value &&
		"stdout" in value &&
		"stderr" in value
	);
}
