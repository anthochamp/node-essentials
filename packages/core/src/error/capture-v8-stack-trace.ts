import { captureV8Frames } from "./capture-v8-frames.js";
import {
	composeV8StackFrameFromV8CallSite,
	type V8StackTrace,
} from "./v8-stack-trace.js";

export type CaptureV8StackTraceOptions = {
	/**
	 * A function to use as the reference point for the stack trace.
	 *
	 * The stack frames above the function will be skipped (including the function
	 * itself).
	 *
	 * Defaults to the `captureV8StackTrace` function itself.
	 */
	reference?: Function;

	/**
	 * Maximum number of stack frames to capture.
	 *
	 * Defaults to `Infinity`.
	 */
	maxFrames?: number;
};

/**
 * Capture the stack trace of the caller as structured V8 call site data
 * (function references, file/line/column, async/native/constructor flags).
 *
 * V8-only (Node.js, Chrome, and other V8 embedders) — no fallback.
 *
 * @returns The captured stack trace, or `[]` if unavailable.
 */
export function captureV8StackTrace(
	options?: CaptureV8StackTraceOptions,
): V8StackTrace {
	const reference = options?.reference ?? captureV8StackTrace;
	const maxFrames = options?.maxFrames ?? Infinity;

	const callSites = captureV8Frames({
		reference,
		maxFrames,
		prepareStackTrace: (_error, stackTrace) => stackTrace,
	});

	return callSites ? callSites.map(composeV8StackFrameFromV8CallSite) : [];
}
