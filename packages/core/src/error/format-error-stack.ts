import { prefixLines } from "../string/prefix-lines.js";
import { ErrorStack } from "./parse-error-stack.js";

export type FormatStackTraceOptions = {
	/**
	 * The indentation to use for each line (except first line).
	 *
	 * Defaults to two spaces.
	 */
	indentation?: string;

	/**
	 * If true, the error message line will be ignored and not included in the
	 * output.
	 *
	 * Defaults to false.
	 */
	skipMessage?: boolean;
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
	const indentation = options?.indentation ?? "  ";
	const skipMessage = options?.skipMessage;

	let lines: string[];
	if (skipMessage) {
		lines = [];
	} else {
		lines = [errorStack.message];
	}

	lines.push(...errorStack.stackTrace);

	return prefixLines(lines, indentation, {
		skipFirstLine: !skipMessage,
	});
}
