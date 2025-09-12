import type { StackTrace } from "@ac-essentials/misc-util";

export enum LoggerLogLevel {
	EMERG = "emerg",
	ALERT = "alert",
	CRITICAL = "critical",
	ERROR = "error",
	WARNING = "warn",
	NOTICE = "notice",
	INFO = "info",
	DEBUG = "debug",
}

export type LoggerMetadata = Record<string, unknown>;

export type LoggerRecord = {
	timestamp: number;
	metadata: LoggerMetadata;
	message: string;
	logLevel: LoggerLogLevel | null;
	stackTrace: StackTrace | null;
};
