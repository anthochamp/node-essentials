import { IError } from "../types/error.js";
import { captureV8Frames } from "./capture-v8-frames.js";
import { StackTrace, parseErrorStack } from "./parse-error-stack.js";

export type CaptureStackTraceOptions = {
	/**
	 * A function to use as the reference point for the stack trace.
	 *
	 * The stack frames above the function will be skipped (including the function
	 * itself).
	 *
	 * Defaults to the `captureStackTrace` function itself.
	 */
	reference?: Function;

	/**
	 * Maximum number of stack frames to capture. This is not supported in all
	 * environments.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stackTraceLimit
	 *
	 * Defaults to `Infinity`.
	 */
	maxFrames?: number;
};

/**
 * Capture the stack trace of the caller.
 *
 * Uses V8's `Error.captureStackTrace` when available (Node.js, Chrome) and
 * falls back to parsing `new Error().stack` on other engines. The fallback
 * filters frames by function name, which is best-effort in minified code.
 *
 * @returns An array of strings representing the stack trace, or `[]` if
 *   unavailable
 */
export function captureStackTrace(
	options?: CaptureStackTraceOptions,
): StackTrace {
	const reference = options?.reference ?? captureStackTrace;
	const maxFrames = options?.maxFrames ?? Infinity;

	const stack = captureV8Frames({ reference, maxFrames });
	if (stack !== undefined) {
		// V8/Node.js/Chrome path: accurate frame stripping via the reference arg
		const errorStack = parseErrorStack({ stack } as IError);
		return errorStack ? errorStack.stackTrace : [];
	}

	// Non-V8 fallback (Firefox, Safari): parse new Error().stack and strip
	// frames up to and including the reference function by name.
	const errorStack = parseErrorStack(new (Error as ErrorConstructor)());
	if (!errorStack) {
		return [];
	}

	let frames = errorStack.stackTrace;

	const refFn = reference;
	if (refFn.name) {
		const refIndex = frames.findIndex((frame) => frame.includes(refFn.name));
		if (refIndex !== -1) {
			frames = frames.slice(refIndex + 1);
		}
	}

	return maxFrames === Infinity ? frames : frames.slice(0, maxFrames);
}
