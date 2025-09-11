import { defaults } from "../../ecma/object/defaults.js";
import {
	composeV8StackFrameFromV8CallSite,
	type V8StackTrace,
} from "./v8-stack-trace.js";

export type CaptureV8StackTraceOptions = {
	// A function to use as the reference point for the stack trace.
	// The stack frames above the function will be skipped (including the function
	// itself).
	// Defaults to the `captureStackTrace` function itself.
	// biome-ignore lint/complexity/noBannedTypes: per spec
	reference?: Function | null;

	// Maximum number of stack frames to capture.
	// Defaults to `Infinity`.
	maxFrames?: number;
};

const CAPTURE_V8_STACK_TRACE_DEFAULT_OPTIONS: Required<CaptureV8StackTraceOptions> =
	{
		reference: null,
		maxFrames: Infinity,
	};

/**
 * Capture the stack trace of the caller.
 *
 * @returns  An array of strings representing the stack trace, or `undefined` if the stack trace is not available
 */
export function captureV8StackTrace(
	options?: CaptureV8StackTraceOptions,
): V8StackTrace {
	const effectiveOptions = defaults(
		options,
		CAPTURE_V8_STACK_TRACE_DEFAULT_OPTIONS,
	);

	// Create a temporary error to capture the stack trace
	// For some reason, using `Error.captureStackTrace` does not work with prepareStackTrace
	const tmp = new Error();

	const originalStackTraceLimit = Error.stackTraceLimit;
	Error.stackTraceLimit = effectiveOptions.maxFrames;

	const originalPrepareStackTrace = Error.prepareStackTrace;
	Error.prepareStackTrace = (err, stack) => {
		return err === tmp ? stack : originalPrepareStackTrace(err, stack);
	};

	let result: V8StackTrace;
	try {
		result = (tmp.stack as unknown as NodeJS.CallSite[]).map(
			composeV8StackFrameFromV8CallSite,
		);
	} finally {
		Error.prepareStackTrace = originalPrepareStackTrace;
		Error.stackTraceLimit = originalStackTraceLimit;
	}

	const referenceIndex = result.findIndex(
		(value) =>
			value.functionName ===
			(effectiveOptions.reference ?? captureV8StackTrace).name,
	);
	if (referenceIndex !== -1) {
		result = result.slice(referenceIndex + 1);
	}

	return result;
}
