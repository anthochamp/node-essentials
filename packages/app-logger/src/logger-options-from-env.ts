import { Attributes } from "@ac-kit/app-report";
import { parseEnvValueAsBool, ProcessEnv } from "@ac-kit/format-shell";

import { LogLevel } from "./log-level.js";

export type LoggerOptions = {
	/** Minimum level that reaches the sink. Default: "info". */
	minLevel?: LogLevel;

	/** Attached to every `LogRecord` written through this logger. */
	attributes?: Attributes;

	/**
	 * Capture a stack trace for a level at or below this one on the generic
	 * severity scale (i.e. this level and anything more severe — the same
	 * comparison direction as `minLevel`). Default: none.
	 */
	captureStackAtOrBelow?: LogLevel | null;

	/**
	 * The clock function to use for timestamps. Should return a number of
	 * milliseconds since the epoch.
	 *
	 * Default: `Date.now`.
	 */
	clock?: () => number;

	/**
	 * Called when a write to the underlying sink fails (or is dropped by the
	 * internal queue's overflow policy). Writes never throw back into the caller
	 * of `log()`/`debug()`/etc.
	 */
	onSinkError?: (error: unknown) => void;
};

/**
 * Builds `LoggerOptions` from environment variables.
 *
 * An explicit opt-in a caller passes to `new Logger(sink,
 * loggerOptionsFromEnv())` — unlike the old module-evaluation-time coupling to
 * `process.env.DEBUG`.
 *
 * `DEBUG` truthy → `minLevel`/`captureStackAtOrBelow` both set to "debug".
 *
 * @param env Defaults to `process.env`.
 */
export function loggerOptionsFromEnv(env: ProcessEnv): LoggerOptions {
	if (parseEnvValueAsBool(env.DEBUG) === true) {
		return { minLevel: "debug", captureStackAtOrBelow: "debug" };
	}

	return {};
}
