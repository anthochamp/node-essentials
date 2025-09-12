import { defaults } from "../object/defaults.js";
import { prefixLines } from "../string/prefix-lines.js";
import type { IError } from "./error.js";

// A stack frame as a single line string
// (as typically found in Error.stack)
export type StackFrame = string;

// A stack trace as an array of stack frame strings
// (as typically found in Error.stack)
export type StackTrace = StackFrame[];

// An error stack with top line and stack trace
// (as typically found in Error.stack)
export type ErrorStack = {
	// The top line of the stack (error message)
	// Example:
	// "Error: Something went wrong"
	message: string;

	// The stack trace lines (with leading whitespace removed)
	// Example:
	// ["at Object.<anonymous> (/path/to/file.js:10:15)", ...]
	stackTrace: StackTrace;
};

/**
 * Parse the stack of an Error-like object into its components.
 *
 * @param error The error to parse
 * @returns The parsed error stack, or undefined if the error has no stack
 */
export function parseErrorStack(error: IError): ErrorStack | undefined {
	if (!error.stack) {
		return;
	}

	const [message, ...stackTrace] = error.stack
		.split(/\r?\n/)
		.map((line) => line.trim());

	return { message, stackTrace };
}

export type FormatStackTraceOptions = {
	// The indentation to use for each line (except first line). Defaults to two spaces.
	indentation?: string;

	// If true, the error message line will be ignored and not included in the output.
	skipMessage?: boolean;
};

const FORMAT_STACK_TRACE_DEFAULT_OPTIONS: Required<FormatStackTraceOptions> = {
	indentation: "  ",
	skipMessage: false,
};

/**
 * Format an error stack back to its original form.
 *
 * @param errorStack The error stack to format
 * @param options Options for formatting the stack trace
 * @returns The formatted error stack as an array of strings (one per line)
 */
export function formatErrorStack(
	errorStack: ErrorStack,
	options?: FormatStackTraceOptions,
): string[] {
	const effectiveOptions = defaults(
		options,
		FORMAT_STACK_TRACE_DEFAULT_OPTIONS,
	);

	let lines: string[];
	if (effectiveOptions.skipMessage) {
		lines = [];
	} else {
		lines = [errorStack.message];
	}

	lines.push(...errorStack.stackTrace);

	return prefixLines(lines, effectiveOptions.indentation, {
		skipFirstLine: !effectiveOptions.skipMessage,
	});
}
