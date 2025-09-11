import { defaults } from "../object/defaults.js";
import type { IError } from "./error.js";
import { parseErrorStack, type StackTrace } from "./error-stack.js";

export type CaptureStackTraceOptions = {
	// A function to use as the reference point for the stack trace.
	// Defaults to the `captureStackTrace` function itself.
	//
	// The stack frames above the function will be skipped (including the function
	// itself).
	// biome-ignore lint/complexity/noBannedTypes: per spec
	reference?: Function | null;

	// Maximum number of stack frames to capture.
	// Defaults to `Infinity`.
	//
	// This is not supported in all environments.
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stackTraceLimit
	maxFrames?: number;
};

const CAPTURE_STACK_TRACE_DEFAULT_OPTIONS: Required<CaptureStackTraceOptions> =
	{
		reference: null,
		maxFrames: Infinity,
	};

/**
 * Capture the stack trace of the caller.
 *
 * @returns  An array of strings representing the stack trace, or `undefined` if the stack trace is not available
 */
export function captureStackTrace(
	options?: CaptureStackTraceOptions,
): StackTrace {
	const effectiveOptions = defaults(
		options,
		CAPTURE_STACK_TRACE_DEFAULT_OPTIONS,
	);

	const originalStackTraceLimit: number | undefined = Error.stackTraceLimit;
	Error.stackTraceLimit = effectiveOptions.maxFrames;

	const tmp = {};
	try {
		Error.captureStackTrace(
			tmp,
			effectiveOptions.reference ?? captureStackTrace,
		);
	} finally {
		Error.stackTraceLimit = originalStackTraceLimit;
	}

	const errorStack = parseErrorStack(tmp as IError);
	if (!errorStack) {
		return [];
	}

	return errorStack.stackTrace;
}
