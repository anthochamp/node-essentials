import type { Attributes } from "@ac-kit/app-report";
import type { StackTrace } from "@ac-kit/core";

import type { LogLevel } from "./log-level.js";

/**
 * One log message, carried as the `data` of a `ReportEvent<LogRecord>`.
 *
 * `timestamp` and the enclosing scope live on the envelope (`ReportEvent`), not
 * here. `error` is raw and unformatted — formatting it into text is a
 * {@link Formatter}'s job, not the logger's, so a JSON sink can still emit it
 * as structured data.
 */
export type LogRecord = {
	level: LogLevel;
	message: string;
	error?: unknown;
	attributes?: Attributes;
	stackTrace?: StackTrace | null;
};
