import { isV8ErrorConstructor } from "../guards/is-v8-error-constructor.js";
import type { V8CallSite } from "../types/v8-call-site.js";

export type CaptureV8FramesOptions<T> = {
	// The function to strip frames above (and including) from the trace.
	reference: Function;

	// Maximum number of stack frames to capture.
	maxFrames: number;

	// When provided, receives the raw V8 call sites before they are
	// stringified, instead of the default formatted stack string.
	prepareStackTrace?: (error: Error, callSites: V8CallSite[]) => T;
};

/**
 * Low-level V8 stack capture shared by `captureStackTrace` and
 * `captureV8StackTrace`.
 *
 * Relies on `Error.captureStackTrace(target, reference)` for native,
 * reference-based frame stripping (accurate even for anonymous/minified
 * functions, unlike name matching), then reads `target.stack` — either as the
 * engine's default formatted string, or via a `prepareStackTrace` hook for
 * structured call sites.
 *
 * @returns `undefined` when the engine has no V8 stack trace API.
 */
export function captureV8Frames<T = string>(
	options: CaptureV8FramesOptions<T>,
): T | undefined {
	if (!isV8ErrorConstructor(Error)) {
		return undefined;
	}

	const tmp = {} as { stack: T };

	const originalStackTraceLimit = Error.stackTraceLimit;
	Error.stackTraceLimit = options.maxFrames;

	const originalPrepareStackTrace = Error.prepareStackTrace;
	const prepareStackTrace = options.prepareStackTrace;
	if (prepareStackTrace) {
		// A custom prepareStackTrace replaces the engine's default formatter for
		// every error read while it is installed, not just `tmp` — fall back to
		// the previous hook, or V8's own per-frame formatting, for the rest.
		Error.prepareStackTrace = (error, callSites) =>
			(error as unknown) === tmp
				? prepareStackTrace(error, callSites as unknown as V8CallSite[])
				: (originalPrepareStackTrace?.(error, callSites) ??
					// oxlint-disable-next-line typescript/no-base-to-string
					`${error}\n${callSites.map((callSite) => `    at ${callSite.toString()}`).join("\n")}`);
	}

	try {
		Error.captureStackTrace(tmp, options.reference);
		return tmp.stack;
	} finally {
		Error.prepareStackTrace = originalPrepareStackTrace;
		Error.stackTraceLimit = originalStackTraceLimit;
	}
}
