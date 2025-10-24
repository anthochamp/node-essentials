import { EOL } from "node:os";
import { type InspectOptions, inspect, styleText } from "node:util";
import {
	type Callable,
	defaults,
	joinNonEmpty,
	prefixLines,
} from "@ac-essentials/misc-util";
import type { Except, SetNonNullable } from "type-fest";
import { LoggerLogLevel, type LoggerRecord } from "../../logger-record.js";
import { loggerIsDebugLogLevel } from "../is-debug-log-level.js";
import type { LoggerRecordStringifier } from "./record-stringifier.js";

export type AnsiLoggerRecordStringifierOptions = {
	/**
	 * The indentation to use when required.
	 * Defaults to two spaces.
	 */
	indentation?: string;

	/**
	 * Whether to print metadata when available.
	 * Defaults to false.
	 */
	printMetadata?: boolean;

	/**
	 * Options to use when inspecting metadata
	 * Defaults to { compact: true, breakLength: Infinity }
	 *
	 * Note: The `colors` option will be overridden by the `colors` option of
	 * this object.
	 */
	metadataInspectOptions?: Except<InspectOptions, "colors">;

	/**
	 * Whether to use colors in the output.
	 * Defaults is 'true'
	 *
	 * This also set the `colors` option in `metadataInspectOptions`.
	 *
	 * Note: If the output/error stream is not a TTY, colors will be disabled
	 * regardless of this setting.
	 */
	colors?: boolean;

	/**
	 * The theme to use for coloring the output.
	 */
	theme?: AnsiLoggerRecordStringifierTheme;

	/**
	 * Options to use when formatting timestamps.
	 * Defaults to:
	 * ```ts
	 * {
	 *   year: "numeric",
	 *   month: "2-digit",
	 *   day: "2-digit",
	 *   hour: "2-digit",
	 *   minute: "2-digit",
	 *   second: "2-digit",
	 *   fractionalSecondDigits: 3,
	 *   timeZoneName: "shortOffset",
	 * }
	 * ```
	 *
	 * If set to `null`, the timestamp will be formatted in ISO 8601 format.
	 */
	dateTimeFormatOptions?: Intl.DateTimeFormatOptions | null;
};

export type AnsiLoggerRecordStringifierTheme = {
	debugText?: Callable<[string], string>;
	timestampText?: Callable<[string], string>;

	logLevels?: Partial<
		Record<
			LoggerLogLevel,
			{
				innerText?: Callable<[string], string>;
				outerText?: Callable<[string], string>;
			}
		>
	>;
};

export const ANSI_LOGGER_RECORD_STRINGIFIER_OPTIONS: Required<AnsiLoggerRecordStringifierOptions> =
	{
		indentation: "  ",
		printMetadata: false,
		metadataInspectOptions: { compact: true, breakLength: Infinity },
		colors: true,

		theme: {
			debugText: (text) => styleText("gray", text),
			timestampText: (text) => styleText("dim", text),
			logLevels: {
				[LoggerLogLevel.EMERG]: {
					innerText: (text) => styleText(["bgMagenta", "white"], text),
					outerText: (text) => styleText("bold", text),
				},
				[LoggerLogLevel.ALERT]: {
					innerText: (text) => styleText(["bgRed", "white"], text),
					outerText: (text) => styleText("bold", text),
				},
				[LoggerLogLevel.CRITICAL]: {
					innerText: (text) => styleText(["bgWhite", "white"], text),
					outerText: (text) => styleText("bold", text),
				},
				[LoggerLogLevel.ERROR]: {
					innerText: (text) => styleText(["bold", "red"], text),
					outerText: (text) => styleText("bold", text),
				},
				[LoggerLogLevel.WARNING]: {
					innerText: (text) => styleText("yellow", text),
					outerText: (text) => styleText("bold", text),
				},
				[LoggerLogLevel.NOTICE]: {
					innerText: (text) => styleText("cyan", text),
					outerText: (text) => styleText("bold", text),
				},
				[LoggerLogLevel.INFO]: {
					innerText: (text) => styleText("green", text),
					outerText: (text) => styleText("bold", text),
				},
			},
		},

		dateTimeFormatOptions: {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			fractionalSecondDigits: 3,
			timeZoneName: "shortOffset",
		},
	};

export type AnsiLoggerRecordStringifierTextComponents = {
	timestamp: string;
	message: string;
	metadata: string | null;
	logLevel: string | undefined;
	stackTrace: string | null | undefined;
};

export interface AnsiTextRecordStringifierFormatters {
	formatTimestamp(record: LoggerRecord): string;
	formatMessage(record: LoggerRecord): string;
	formatLogLevel(record: SetNonNullable<LoggerRecord, "logLevel">): string;
	formatMetadata(record: LoggerRecord): string;
	formatStackTrace(record: SetNonNullable<LoggerRecord, "stackTrace">): string;
	formatTextComponents(
		components: AnsiLoggerRecordStringifierTextComponents,
		record: LoggerRecord,
	): string;
}

export class AnsiLoggerRecordStringifier
	implements LoggerRecordStringifier, AnsiTextRecordStringifierFormatters
{
	private readonly options: Required<AnsiLoggerRecordStringifierOptions>;
	private readonly dateTimeFormat: Intl.DateTimeFormat | null = null;

	constructor(options?: AnsiLoggerRecordStringifierOptions) {
		this.options = defaults(options, ANSI_LOGGER_RECORD_STRINGIFIER_OPTIONS);

		if (this.options.dateTimeFormatOptions !== null) {
			this.dateTimeFormat = new Intl.DateTimeFormat(
				undefined,
				this.options.dateTimeFormatOptions,
			);
		}
	}

	stringify(record: LoggerRecord): string {
		const timestampText = this.formatTimestamp(record);

		let messageText = this.formatMessage(record);
		if (record.logLevel === null) {
			messageText = `-- ${messageText} --`;
		}

		let metadataText: string | null | undefined;
		if (this.options.printMetadata && Object.keys(record.metadata).length) {
			metadataText = this.formatMetadata(record);
		} else {
			metadataText = null;
		}

		let logLevelText: string | undefined;
		let stackTraceText: string | null | undefined;

		if (record.logLevel !== null) {
			logLevelText = this.formatLogLevel(
				record as SetNonNullable<LoggerRecord, "logLevel">,
			);
		}

		if (record.stackTrace) {
			stackTraceText = this.formatStackTrace(
				record as SetNonNullable<LoggerRecord, "stackTrace">,
			);
		} else {
			stackTraceText = null;
		}

		const textComponents: AnsiLoggerRecordStringifierTextComponents = {
			timestamp: timestampText,
			message: messageText,
			metadata: metadataText,
			logLevel: logLevelText,
			stackTrace: stackTraceText,
		};

		return this.formatTextComponents(textComponents, record);
	}

	formatTimestamp(record: LoggerRecord): string {
		let timestampText: string;
		if (this.dateTimeFormat) {
			timestampText = this.dateTimeFormat.format(record.timestamp);
		} else {
			timestampText = new Date(record.timestamp).toISOString();
		}

		if (this.options.theme.timestampText) {
			timestampText = this.options.theme.timestampText(timestampText);
		}

		return timestampText;
	}
	formatMessage(record: LoggerRecord): string {
		return record.message;
	}
	formatLogLevel(record: SetNonNullable<LoggerRecord, "logLevel">): string {
		let logLevelText = record.logLevel.toUpperCase();

		const logLevelTheme = this.options.theme.logLevels?.[record.logLevel];
		if (logLevelTheme?.innerText) {
			logLevelText = logLevelTheme.innerText(logLevelText);
		}

		logLevelText = `[${logLevelText}]`;

		if (logLevelTheme?.outerText) {
			logLevelText = logLevelTheme.outerText(logLevelText);
		}

		return logLevelText;
	}
	formatMetadata(record: LoggerRecord): string {
		return `Metadata: ${inspect(record.metadata, { ...this.options.metadataInspectOptions, colors: this.options.colors })}`;
	}
	formatStackTrace(record: SetNonNullable<LoggerRecord, "stackTrace">): string {
		return record.stackTrace.join(EOL);
	}

	formatTextComponents(
		textComponents: AnsiLoggerRecordStringifierTextComponents,
		record: LoggerRecord,
	): string {
		const linePrefix = joinNonEmpty(
			[textComponents.timestamp, textComponents.logLevel],
			" ",
		);

		const fullMessage = prefixLines(
			[
				textComponents.message,
				textComponents.stackTrace,
				textComponents.metadata,
			].filter((v) => v !== null && v !== undefined),
			this.options.indentation,
			{
				skipFirstLine: true,
			},
		).join(EOL);

		let result = prefixLines(fullMessage, `${linePrefix} `).join(EOL) + EOL;

		if (
			this.options.theme.debugText &&
			record.logLevel !== null &&
			loggerIsDebugLogLevel(record.logLevel)
		) {
			result = this.options.theme.debugText?.(result);
		}

		return result;
	}
}
