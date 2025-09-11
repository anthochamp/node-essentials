import { LoggerLogLevel } from "../logger-record.js";
import { loggerCompareLogLevel } from "./compare-log-level.js";

export function loggerIsDebugLogLevel(logLevel: LoggerLogLevel): boolean {
	return loggerCompareLogLevel(logLevel, LoggerLogLevel.DEBUG) >= 0;
}
