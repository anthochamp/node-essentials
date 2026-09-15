export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const SEVERITY_: Record<LogLevel, number> = {
	fatal: 10,
	error: 20,
	warn: 40,
	info: 50,
	debug: 70,
};

/**
 * `level`'s position on the generic 0 (most severe) to 100 (least severe)
 * scale.
 */
export function logLevelSeverity(level: LogLevel): number {
	return SEVERITY_[level];
}

/**
 * Compares two log levels by severity.
 *
 * @returns A negative number when `a` is more severe than `b`, a positive
 *   number when `a` is less severe than `b`, `0` when equal.
 */
export function compareLogLevel(a: LogLevel, b: LogLevel): number {
	return SEVERITY_[a] - SEVERITY_[b];
}
