import { LoggerLogLevel } from "../logger-record.js";

const LOGGER_LOG_LEVEL_TO_SYSLOG_SEVERITY: Record<LoggerLogLevel, number> = {
	[LoggerLogLevel.EMERG]: 0,
	[LoggerLogLevel.ALERT]: 1,
	[LoggerLogLevel.CRITICAL]: 2,
	[LoggerLogLevel.ERROR]: 3,
	[LoggerLogLevel.WARNING]: 4,
	[LoggerLogLevel.NOTICE]: 5,
	[LoggerLogLevel.INFO]: 6,
	[LoggerLogLevel.DEBUG]: 7,
};

/**
 * Compare two log levels based on their syslog severity equivalent.
 *
 * @param a the first log level to compare
 * @param b the second log level to compare
 * @returns a negative number if `a` is less severe than `b`, a positive number if `a` is more severe than `b`, or `0` if they are equal
 */
export function loggerCompareLogLevel(
	a: LoggerLogLevel,
	b: LoggerLogLevel,
): number {
	return (
		LOGGER_LOG_LEVEL_TO_SYSLOG_SEVERITY[a] -
		LOGGER_LOG_LEVEL_TO_SYSLOG_SEVERITY[b]
	);
}
