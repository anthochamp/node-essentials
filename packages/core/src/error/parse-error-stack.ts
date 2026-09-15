import { IError } from "../types/error.js";

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
 * A location in source code — what a V8 `CallSite` already exposes. Not yet
 * produced by `parseErrorStack`, which still leaves each frame an unparsed
 * `StackFrame` string; a future structured variant would return these.
 */
export type SourceLocation = {
	readonly file: string;
	readonly line?: number;
	readonly column?: number;
	readonly functionName?: string;
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

	return { message: message!, stackTrace };
}
