import { LoggerLogLevel } from "../logger-record.js";
import { loggerCompareLogLevel } from "./compare-log-level.js";

/**
 * Test if a log level is considered an error level (i.e. `emerg`, `alert`, `crit`, `error`).
 *
 * @param logLevel The log level to test
 * @returns True if the log level is an error level, false otherwise
 */
export function loggerIsErrorLogLevel(logLevel: LoggerLogLevel): boolean {
	return loggerCompareLogLevel(logLevel, LoggerLogLevel.ERROR) <= 0;
}
