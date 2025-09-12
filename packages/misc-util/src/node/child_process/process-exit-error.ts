import { joinNonEmpty } from "../../ecma/string/join-non-empty.js";
import type { INodeExecError } from "./node-exec-error.js";

/**
 * Error thrown when a shell command exits with a non-zero code or is
 * terminated by a signal.
 */
export class ProcessExitError extends Error {
	constructor(
		readonly code: string | number | null,
		readonly signal: NodeJS.Signals | null,
		readonly killed: boolean,
		options?: ErrorOptions,
	) {
		super(
			joinNonEmpty(
				[
					code !== null || signal !== null || killed ? "Process exited" : null,
					code !== null ? `with code ${code}` : null,
					signal !== null ? `with signal ${signal}` : null,
					killed ? "(killed)" : null,
				],
				" ",
			),
			options,
		);

		this.name = "ProcessExitError";
	}
}

/**
 * Error thrown when a shell command exits with a non-zero code or is
 * terminated by a signal, including its stdout and stderr output.
 */
export class ProcessExitWithOutputError extends ProcessExitError {
	static fromNodeExecError(error: INodeExecError): ProcessExitWithOutputError {
		const result = new ProcessExitWithOutputError(
			error.code,
			error.signal,
			error.killed,
			error.stdout,
			error.stderr,
			error.cause
				? {
						cause: error.cause,
					}
				: undefined,
		);

		Error.captureStackTrace(
			result,
			ProcessExitWithOutputError.fromNodeExecError,
		);
		return result;
	}

	constructor(
		code: string | number | null,
		signal: NodeJS.Signals | null,
		killed: boolean,
		readonly stdout: string | Buffer,
		readonly stderr: string | Buffer,
		options?: ErrorOptions,
	) {
		super(code, signal, killed, options);

		this.name = "ProcessExitWithOutputError";
	}
}
