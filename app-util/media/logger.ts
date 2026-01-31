import { type InspectOptions, inspect } from "node:util";
import {
	type CaptureStackTraceOptions,
	captureStackTrace,
	defaults,
	type FormatErrorOptions,
	formatError,
	parseEnvVariableValueAsBool,
	type StackTrace,
} from "@ac-essentials/misc-util";
import type { Except } from "type-fest";
import type { ILoggerPrinter } from "./logger-printer.js";
import {
	LoggerLogLevel,
	type LoggerMetadata,
	type LoggerRecord,
} from "./logger-record.js";
import { loggerCompareLogLevel } from "./util/compare-log-level.js";

export type LoggerMetadataWithoutError = LoggerMetadata & { error?: never };

export type LoggerOptions = {
	/**
	 * Initial metadata to attach to all log messages from this printer.
	 */
	initialPersistantMetadata?: LoggerMetadata;

	/**
	 * Minimum log level to print. Messages with a log level less severe than this will be ignored.
	 */
	minLogLevel?: LoggerLogLevel | null;

	/**
	 * Options for formatting errors.
	 *
	 * The `prefix` option is omitted here as it is set per-log message.
	 *
	 * Defaults to true if `process.env.DEBUG` is truthy, otherwise "top-level-only".
	 */
	formatErrorOptions?: Except<FormatErrorOptions, "prefix">;

	/**
	 * debug log metadata inspect options.
	 */
	debugInspectOptions?: InspectOptions;
};

export type LoggerLogOptions = {
	stackTraceReference?: CaptureStackTraceOptions["reference"] | null;

	metadata?: LoggerMetadata;
};

const LOGGER_DEFAULT_OPTIONS: Required<LoggerOptions> = {
	minLogLevel: null,
	initialPersistantMetadata: {},
	formatErrorOptions: {
		stackTrace: parseEnvVariableValueAsBool(process.env.DEBUG)
			? true
			: "top-level-only",
	},
	debugInspectOptions: {},
};

export class Logger {
	private readonly options: Required<
		Except<LoggerOptions, "initialPersistantMetadata">
	>;
	private readonly persistantMetadata: LoggerMetadata;

	/**
	 * Create a new logger.
	 *
	 * @param printers The printer(s) to use for logging
	 * @param options Options for the logger
	 * @param parent An optional parent logger to inherit settings from (used when forking a new logger)
	 */
	constructor(
		private readonly printers: ILoggerPrinter[],
		options?: LoggerOptions,
		private readonly parent: Logger | null = null,
	) {
		const { initialPersistantMetadata, ...restOptions } = defaults(
			options,
			parent?.options,
			LOGGER_DEFAULT_OPTIONS,
		);

		this.persistantMetadata = initialPersistantMetadata;
		this.options = restOptions;
	}

	/**
	 * Create a new logger that inherits settings from this logger.
	 *
	 * @param options Options for the new logger
	 * @returns A new logger that inherits settings from this logger
	 */
	fork(options?: LoggerOptions): Logger {
		return new Logger(this.printers, options, this);
	}

	/**
	 * Clear the console.
	 */
	async clear(): Promise<void> {
		await Promise.all(this.printers.map((printer) => printer.clear()));
	}

	/**
	 * Flush any buffered output.
	 */
	async flush(): Promise<void> {
		await Promise.all(this.printers.map((printer) => printer.flush()));
	}

	/**
	 * Log an emergency error with an optional description and metadata.
	 *
	 * @param error The error to log
	 * @param description An optional description to prefix the error message
	 * @param metadata Optional metadata to attach to the log message
	 */
	emerg(
		error: unknown,
		description?: string,
		metadata?: LoggerMetadataWithoutError,
	): Promise<void> {
		return this.log(
			LoggerLogLevel.EMERG,
			formatError(error, {
				...this.options.formatErrorOptions,
				prefix: description,
			}),
			{ metadata: { ...metadata, error } },
		);
	}

	/**
	 * Log an alert error with an optional description and metadata.
	 *
	 * @param error The error to log
	 * @param description An optional description to prefix the error message
	 * @param metadata Optional metadata to attach to the log message
	 */
	alert(
		error: unknown,
		description?: string,
		metadata?: LoggerMetadataWithoutError,
	): Promise<void> {
		return this.log(
			LoggerLogLevel.ALERT,
			formatError(error, {
				...this.options.formatErrorOptions,
				prefix: description,
			}),
			{ metadata: { ...metadata, error } },
		);
	}

	/**
	 * Log a critical error with an optional description and metadata.
	 *
	 * @param error The error to log
	 * @param description An optional description to prefix the error message
	 * @param metadata Optional metadata to attach to the log message
	 */
	critical(
		error: unknown,
		description?: string,
		metadata?: LoggerMetadataWithoutError,
	): Promise<void> {
		return this.log(
			LoggerLogLevel.CRITICAL,
			formatError(error, {
				...this.options.formatErrorOptions,
				prefix: description,
			}),
			{ metadata: { ...metadata, error } },
		);
	}

	/**
	 * Log an error with an optional description and metadata.
	 *
	 * @param error The error to log
	 * @param description An optional description to prefix the error message
	 * @param metadata Optional metadata to attach to the log message
	 */
	error(
		error: unknown,
		description?: string,
		metadata?: LoggerMetadataWithoutError,
	): Promise<void> {
		return this.log(
			LoggerLogLevel.ERROR,
			formatError(error, {
				...this.options.formatErrorOptions,
				prefix: description,
			}),
			{ metadata: { ...metadata, error } },
		);
	}

	/**
	 * Log a warning with an optional description and metadata.
	 *
	 * @param error The warning to log
	 * @param description An optional description to prefix the warning message
	 * @param metadata Optional metadata to attach to the log message
	 */
	warning(
		error: unknown,
		description?: string,
		metadata?: LoggerMetadataWithoutError,
	): Promise<void> {
		return this.log(
			LoggerLogLevel.WARNING,
			formatError(error, {
				...this.options.formatErrorOptions,
				prefix: description,
			}),
			{ metadata: { ...metadata, error } },
		);
	}

	/**
	 * Log a notice message with optional metadata.
	 *
	 * @param message The message to log
	 * @param metadata Optional metadata to attach to the log message
	 */
	notice(message: string, metadata?: LoggerMetadata): Promise<void> {
		return this.log(LoggerLogLevel.NOTICE, message, { metadata });
	}

	/**
	 * Log an informative message with optional metadata.
	 *
	 * @param message The message to log
	 * @param metadata Optional metadata to attach to the log message
	 */
	info(message: string, metadata?: LoggerMetadata): Promise<void> {
		return this.log(LoggerLogLevel.INFO, message, { metadata });
	}

	/**
	 * Log debug metadata with a description.
	 *
	 * If `process.env.DEBUG` is truthy, a stack trace will be captured and
	 * attached to the log message.
	 *
	 * @param metadata Metadata to log
	 * @param description Description of the debug log
	 */
	debug(metadata: LoggerMetadata, description: string): Promise<void> {
		const message = `${description}: ${inspect(metadata, this.options.debugInspectOptions)}`;

		return this.log(LoggerLogLevel.DEBUG, message, {
			stackTraceReference: parseEnvVariableValueAsBool(process.env.DEBUG)
				? this.debug
				: null,
			metadata,
		});
	}

	/**
	 * Log a message with a specific log level, message and options.
	 *
	 * @param level Log level
	 * @param message Message
	 * @param options Optional log options
	 */
	async log(
		level: LoggerLogLevel,
		message: string,
		options?: LoggerLogOptions,
	): Promise<void> {
		if (
			this.options.minLogLevel !== null &&
			loggerCompareLogLevel(level, this.options.minLogLevel) > 0
		) {
			return;
		}

		let stackTrace: StackTrace | null = null;
		if (options?.stackTraceReference) {
			stackTrace = captureStackTrace({
				reference: options.stackTraceReference,
			});
		}

		const record: LoggerRecord = {
			timestamp: Date.now(),
			message,
			logLevel: level,
			stackTrace,
			metadata: {
				...this.composeEffectivePersistantMetadata(),
				...options?.metadata,
			},
		};

		return this.print(record);
	}

	private async print(record: LoggerRecord): Promise<void> {
		await Promise.all(this.printers.map((printer) => printer.print(record)));
	}

	private composeEffectivePersistantMetadata(): LoggerMetadata {
		return {
			...this.parent?.composeEffectivePersistantMetadata(),
			...this.persistantMetadata,
		};
	}
}
