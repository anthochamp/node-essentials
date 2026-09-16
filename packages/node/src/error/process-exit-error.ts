import {
	isAsciiWhitespace,
	joinNonEmpty,
	nextUtf8Boundary,
} from "@ac-kit/core";

import type { INodeExecError } from "./node-exec-error.js";

const DEFAULT_MAX_OUTPUT_LENGTH_ = 32 * 1024;

function hasContent_(output: string | Buffer): boolean {
	return typeof output === "string"
		? /\S/.test(output)
		: output.some((byte) => !isAsciiWhitespace(byte));
}

function getOutputTail_(
	output: string | Buffer,
	maxLength: number,
): { text: string; omittedLength: number; unit: string } {
	const start = Math.max(0, output.length - maxLength);

	if (typeof output === "string") {
		return {
			text: output.slice(start),
			omittedLength: start,
			unit: "characters",
		};
	}

	const byteStart = nextUtf8Boundary(output, start);

	return {
		text: output.toString("utf8", byteStart),
		omittedLength: byteStart,
		unit: "bytes",
	};
}

function getOutputMessage_(
	stdout: string | Buffer,
	stderr: string | Buffer,
	maxOutputLength: number,
): string {
	const [name, output]: readonly [string, string | Buffer] = hasContent_(stderr)
		? ["stderr", stderr]
		: ["stdout", stdout];

	if (!hasContent_(output)) {
		return "";
	}

	const { text, omittedLength, unit } = getOutputTail_(output, maxOutputLength);
	const truncation =
		omittedLength > 0
			? ` (last ${output.length - omittedLength} of ${output.length} ${unit})`
			: "";

	return `${name}${truncation}:\n${text}`;
}

/**
 * Error thrown when a shell command exits with a non-zero code or is terminated
 * by a signal.
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

export type ProcessExitWithOutputErrorOptions = ErrorOptions & {
	/**
	 * How much of the failing stream the message keeps, counted in characters for
	 * string output and in bytes for `Buffer` output. Default `32768`.
	 */
	readonly maxOutputLength?: number | null;
};

/**
 * Error thrown when a shell command exits with a non-zero code or is terminated
 * by a signal, including its stdout and stderr output.
 *
 * The message appends the failing stream — `stderr` when it holds anything but
 * whitespace, `stdout` otherwise — keeping its tail up to
 * {@link ProcessExitWithOutputErrorOptions.maxOutputLength} and stating how much
 * it dropped. {@link stdout} and {@link stderr} always carry the untruncated
 * output.
 */
export class ProcessExitWithOutputError extends ProcessExitError {
	static fromNodeExecError(
		error: INodeExecError,
		options?: Exclude<ProcessExitWithOutputErrorOptions, "cause">,
	): ProcessExitWithOutputError {
		const result = new ProcessExitWithOutputError(
			error.code,
			error.signal,
			error.killed,
			error.stdout,
			error.stderr,
			{
				...options,
				cause: error.cause,
			},
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
		options?: ProcessExitWithOutputErrorOptions,
	) {
		super(code, signal, killed, options);

		this.name = "ProcessExitWithOutputError";
		this.message = joinNonEmpty(
			[
				this.message,
				getOutputMessage_(
					stdout,
					stderr,
					options?.maxOutputLength ?? DEFAULT_MAX_OUTPUT_LENGTH_,
				),
			],
			"\n\n",
		);
	}
}
