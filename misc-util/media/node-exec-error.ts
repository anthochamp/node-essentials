import type { RequiredKeysOf } from "type-fest";
import { type IError, isErrorLike } from "../../ecma/error/error.js";

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
	if (isErrorLike(value)) {
		const { code, killed, signal, cmd, stderr, stdout } = value as Pick<
			INodeExecError,
			RequiredKeysOf<INodeExecError>
		>;

		return (
			code !== undefined &&
			killed !== undefined &&
			signal !== undefined &&
			cmd !== undefined &&
			stderr !== undefined &&
			stdout !== undefined
		);
	}

	return false;
}
