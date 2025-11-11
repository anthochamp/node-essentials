import { Console, type ConsoleConstructor } from "node:console";
import { EOL } from "node:os";
import { formatWithOptions, type InspectOptions, inspect } from "node:util";
import {
	captureStackTrace,
	defaults,
	joinNonEmpty,
	Stack,
} from "@ac-essentials/misc-util";
import { Temporal } from "temporal-polyfill";
import type { ILoggerPrinter } from "./logger-printer.js";
import {
	LoggerLogLevel,
	type LoggerMetadata,
	type LoggerRecord,
} from "./logger-record.js";

// List of all `console` log methods
// https://console.spec.whatwg.org/#loglevel-severity
type LoggerConsoleLogLevel =
	// log
	| "log"
	| "trace"
	| "dir"
	| "dirxml"
	| "group"
	| "groupCollapsed"
	| "debug"
	| "timeLog"
	// info
	| "count"
	| "info"
	| "timeEnd"
	// warning
	| "warn"
	| "countReset"
	// error
	| "error"
	| "assert";

// Map of `console` log methods to `LoggerLogLevel`
// https://console.spec.whatwg.org/#loglevel-severity
const LOGGER_CONSOLE_LOG_LEVEL_TO_LOGGER_LOG_LEVEL: Record<
	LoggerConsoleLogLevel,
	LoggerLogLevel
> = {
	log: LoggerLogLevel.DEBUG,
	trace: LoggerLogLevel.DEBUG,
	dir: LoggerLogLevel.DEBUG,
	dirxml: LoggerLogLevel.DEBUG,
	group: LoggerLogLevel.DEBUG,
	groupCollapsed: LoggerLogLevel.DEBUG,
	debug: LoggerLogLevel.DEBUG,
	timeLog: LoggerLogLevel.DEBUG,
	count: LoggerLogLevel.INFO,
	info: LoggerLogLevel.INFO,
	timeEnd: LoggerLogLevel.INFO,
	warn: LoggerLogLevel.WARNING,
	countReset: LoggerLogLevel.WARNING,
	error: LoggerLogLevel.ERROR,
	assert: LoggerLogLevel.ERROR,
} as const;

const LOGGER_CONSOLE_PATCHABLE_METHODS = [
	"assert",
	"clear",
	"count",
	"countReset",
	"debug",
	"dir",
	"dirxml",
	"error",
	"group",
	"groupCollapsed",
	"groupEnd",
	"info",
	"log",
	"table",
	"trace",
	"warn",
	"time",
	"timeEnd",
	"timeLog",
	// Node.js extensions
	"timeStamp",
	"profile",
	"profileEnd",
] as const;

/**
 * Options for the `LoggerConsole` class.
 */

export type LoggerConsoleOptions = {
	/**
	 * Options to pass to `util.formatWithOptions` and `util.inspect` when formatting log messages.
	 *
	 * See: https://nodejs.org/api/util.html#util_util_formatwithoptions_inspect_options_args
	 */
	inspectOptions?: InspectOptions;
};

const LOGGER_CONSOLE_DEFAULT_OPTIONS: Required<LoggerConsoleOptions> = {
	inspectOptions: {},
};

/**
 * A `Console` implementation that uses a `LoggerPrinter` to print log messages.
 *
 * Implements the standard `Console` interface as defined by:
 * https://console.spec.whatwg.org/
 *
 * Also implements the Node.js extensions to the `Console` interface as defined by:
 * https://nodejs.org/api/console.html#console_console
 */
export class LoggerConsole implements Console {
	private readonly options: Required<LoggerConsoleOptions>;
	private readonly nodeConsole = new Console(process.stdout, process.stderr);
	private readonly countMap = new Map<string, number>();
	private readonly timerTable = new Map<string, Temporal.Instant>();
	private readonly groupStack = new Stack<string>();
	// @ts-expect-error: until https://github.com/microsoft/TypeScript/pull/60646 is merged
	private readonly durationFormatter = new Intl.DurationFormat(undefined, {
		style: "narrow",
	});

	/**
	 * Creates a new `LoggerConsole` instance.
	 *
	 * @param printers The printer(s) to use for logging
	 * @param options Optional settings for the logger console instance
	 */
	constructor(
		private readonly printers: ILoggerPrinter[],
		options?: LoggerConsoleOptions,
	) {
		this.options = defaults(options, LOGGER_CONSOLE_DEFAULT_OPTIONS);
	}

	/**
	 * Patches the methods of a target `Console` object to use the methods of a
	 * source `Console` object.
	 *
	 * This can be used to redirect the output of the global `console` object to
	 * an instance of `LoggerConsole`.
	 *
	 * Example:
	 * 	const loggerConsole = new LoggerConsole(printer);
	 * 	LoggerConsole.patchConsole(console, loggerConsole);
	 *
	 * @param target The target `Console` object to patch
	 * @param source The source `Console` object to use for the methods
	 */
	static patchConsole(target: Console, source: Console): void {
		for (const methodName of LOGGER_CONSOLE_PATCHABLE_METHODS) {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic property access
			(target as any)[methodName] = source[methodName].bind(source);
		}
	}

	//
	// LOGGING FUNCTIONS
	// https://console.spec.whatwg.org/#logging
	//

	// https://console.spec.whatwg.org/#assert
	assert(condition: unknown, ...data: unknown[]): void {
		if (condition) {
			return;
		}

		const message0: string[] = ["Assertion failed"];

		let messageRest: unknown[];

		const [first, ...rest] = data;

		if (typeof first === "string") {
			message0.push(first);
			messageRest = rest;
		} else {
			messageRest = data;
		}

		void this.logger("assert", [message0.join(": "), ...messageRest]);
	}

	// https://console.spec.whatwg.org/#clear
	clear(): void {
		this.countMap.clear();
		this.timerTable.clear();

		while (this.groupStack.count() > 0) {
			this.groupEnd();
		}

		void Promise.all(this.printers.map((printer) => printer.clear()));
	}

	// https://console.spec.whatwg.org/#debug
	debug(...data: unknown[]): void {
		void this.logger("debug", data);
	}

	// https://console.spec.whatwg.org/#error
	error(...data: unknown[]): void {
		void this.logger("error", data);
	}

	// https://console.spec.whatwg.org/#info
	info(...data: unknown[]): void {
		void this.logger("info", data);
	}

	// https://console.spec.whatwg.org/#log
	log(...data: unknown[]): void {
		void this.logger("log", data);
	}

	// https://console.spec.whatwg.org/#table
	table(tabularData: unknown, properties?: string[]): void {
		if (tabularData === null || tabularData === undefined) {
			void this.logger("log", [tabularData]);
			return;
		}

		if (
			typeof tabularData !== "object" ||
			(Array.isArray(tabularData) && tabularData.length === 0) ||
			(!Array.isArray(tabularData) && Object.keys(tabularData).length === 0)
		) {
			void this.logger("log", ["(empty)"]);
			return;
		}

		const rows: Record<string, unknown>[] = [];

		if (Array.isArray(tabularData)) {
			for (const item of tabularData) {
				if (typeof item === "object" && item !== null) {
					rows.push(item as Record<string, unknown>);
				} else {
					rows.push({ value: item });
				}
			}
		} else {
			for (const [key, value] of Object.entries(tabularData)) {
				if (typeof value === "object" && value !== null) {
					rows.push({ key, ...(value as Record<string, unknown>) });
				} else {
					rows.push({ key, value });
				}
			}
		}

		if (rows.length === 0) {
			void this.logger("log", ["(empty)"]);
			return;
		}

		const allProperties = new Set<string>();
		for (const row of rows) {
			for (const key of Object.keys(row)) {
				allProperties.add(key);
			}
		}

		// biome-ignore lint/nursery/noUnnecessaryConditions: false positive
		const selectedProperties = properties
			? properties.filter((p) => allProperties.has(p))
			: Array.from(allProperties);

		const header = selectedProperties;

		const tableRows = rows.map((row) =>
			selectedProperties.map((prop) => {
				const value = row[prop];
				if (value === undefined) {
					return "";
				}
				return inspect(value, this.options.inspectOptions);
			}),
		);

		// Compute column widths
		const colWidths = header.map((col, i) =>
			// biome-ignore lint/style/noNonNullAssertion: tableRows's row has been created from selectedProperties (same length as header)
			Math.max(col.length, ...tableRows.map((row) => row[i]!.length)),
		);

		// Create a horizontal separator
		const separator = colWidths.map((w) => "-".repeat(w)).join(" | ");

		// Format the table
		const lines = [
			header
				// biome-ignore lint/style/noNonNullAssertion: colWidths has been created from header (same length)
				.map((col, i) => col.padEnd(colWidths[i]!))
				.join(" | "),
			separator,
			...tableRows.map((row) =>
				row
					// biome-ignore lint/style/noNonNullAssertion: colWidths has been created from header (same length as tableRows)
					.map((cell, i) => cell.padEnd(colWidths[i]!))
					.join(" | "),
			),
		];

		void this.logger("log", [lines.join("\n")]);
	}

	// https://console.spec.whatwg.org/#trace
	trace(...data: unknown[]): void {
		void this.print(
			"trace",
			[
				joinNonEmpty(["Trace", this.format(data)], ": "),
				...captureStackTrace({ reference: this.trace }),
			].join(EOL),
		);
	}

	// https://console.spec.whatwg.org/#warn
	warn(...data: unknown[]): void {
		void this.logger("warn", data);
	}

	// https://console.spec.whatwg.org/#dir
	dir(item: unknown, options?: InspectOptions): void {
		void this.print("dir", item, options);
	}

	// https://console.spec.whatwg.org/#dirxml
	dirxml(...data: unknown[]): void {
		void this.logger("dirxml", data);
	}

	//
	// COUNTING FUNCTIONS
	// https://console.spec.whatwg.org/#counting
	//

	// https://console.spec.whatwg.org/#count
	count(label: string): void {
		const count = (this.countMap.get(label) ?? 0) + 1;
		this.countMap.set(label, count);

		void this.logger("count", [`${label}: ${count}`]);
	}

	// https://console.spec.whatwg.org/#countreset
	countReset(label: string): void {
		if (this.countMap.has(label)) {
			this.countMap.delete(label);
			return;
		}

		void this.logger("countReset", [`Counter '${label}' does not exist`]);
	}

	//
	// GROUPING FUNCTIONS
	// https://console.spec.whatwg.org/#grouping
	//

	// https://console.spec.whatwg.org/#group
	group(...data: unknown[]): void {
		const label = data.length === 0 ? "Group" : this.format(data);
		this.groupStack.push(label);

		void this.print("group", label);
	}

	// https://console.spec.whatwg.org/#groupcollapsed
	groupCollapsed(...data: unknown[]): void {
		const label = data.length === 0 ? "Group" : this.format(data);
		this.groupStack.push(label);

		void this.print("groupCollapsed", label);
	}

	// https://console.spec.whatwg.org/#groupend
	groupEnd(): void {
		let groupLabel: string | undefined;
		if ((groupLabel = this.groupStack.pop()) !== undefined) {
			const now = Date.now();

			void Promise.all(
				this.printers.map((printer) =>
					printer.print({
						timestamp: now,
						metadata: {},
						message: `end of ${groupLabel}`,
						logLevel: null,
						stackTrace: null,
					}),
				),
			);
		}
	}

	//
	// TIMING FUNCTIONS
	// https://console.spec.whatwg.org/#timing
	//

	// https://console.spec.whatwg.org/#time
	time(label: string): void {
		if (this.timerTable.has(label)) {
			void this.logger("warn", [`Timer '${label}' already exists`]);
			return;
		}
		this.timerTable.set(label, Temporal.Now.instant());
	}

	// https://console.spec.whatwg.org/#timelog
	timeLog(label: string, ...data: unknown[]): void {
		const startTime = this.timerTable.get(label);
		if (startTime === undefined) {
			void this.logger("warn", [`Timer '${label}' does not exist`]);
			return;
		}
		const duration = this.durationFormatter.format(
			Temporal.Now.instant().since(startTime),
		);
		void this.logger("timeLog", [`${label}: ${duration}`, ...data]);
	}

	// https://console.spec.whatwg.org/#timeend
	timeEnd(label: string): void {
		const startTime = this.timerTable.get(label);
		if (startTime === undefined) {
			void this.logger("warn", [`Timer '${label}' does not exist`]);
			return;
		}
		const duration = this.durationFormatter.format(
			Temporal.Now.instant().since(startTime),
		);
		this.timerTable.delete(label);
		void this.logger("timeEnd", [`${label}: ${duration}`]);
	}

	//
	// NODE.JS EXTENSIONS
	// https://nodejs.org/api/console.html#console_console
	//

	Console: ConsoleConstructor = Console;

	// https://nodejs.org/api/console.html#console_time_stamp_label
	timeStamp(label?: string): void {
		this.nodeConsole.timeStamp(label);
	}

	// https://nodejs.org/api/console.html#console_profile_label
	profile(label?: string): void {
		this.nodeConsole.profile(label);
	}

	// https://nodejs.org/api/console.html#console_profileend_label
	profileEnd(label?: string): void {
		this.nodeConsole.profileEnd(label);
	}

	//
	// PRIVATE METHODS
	//

	// https://console.spec.whatwg.org/#logger
	private async logger(
		logLevel: LoggerConsoleLogLevel,
		data: unknown[],
	): Promise<void> {
		if (data.length === 0) {
			return;
		}

		const [first, ...rest] = data;

		if (rest.length === 0) {
			return this.print(logLevel, first);
		}

		return this.print(logLevel, this.format(data));
	}

	// https://console.spec.whatwg.org/#formatter
	private format(data: unknown[]): string {
		return formatWithOptions(this.options.inspectOptions, ...data);
	}

	// https://console.spec.whatwg.org/#printer
	private async print(
		logLevel: LoggerConsoleLogLevel,
		data: unknown,
		options?: InspectOptions,
	): Promise<void> {
		let message: string;
		const metadata: LoggerMetadata = {};
		if (typeof data === "string") {
			message = data;
		} else {
			message = inspect(data, defaults(options, this.options.inspectOptions));
			metadata.data = data;
		}

		const lastGroupLabel = this.groupStack.top();

		let record: LoggerRecord;

		if (logLevel === "group" || logLevel === "groupCollapsed") {
			record = {
				timestamp: Date.now(),
				message: `start of ${lastGroupLabel} (${logLevel === "groupCollapsed" ? "collapsed" : "expanded"})`,
				metadata,
				logLevel: null,
				stackTrace: null,
			};
		} else {
			record = {
				timestamp: Date.now(),
				message: `${lastGroupLabel ? `[${lastGroupLabel}] ` : ""}${message}`,
				metadata,
				logLevel: LOGGER_CONSOLE_LOG_LEVEL_TO_LOGGER_LOG_LEVEL[logLevel],
				stackTrace: null,
			};
		}

		await Promise.all(this.printers.map((printer) => printer.print(record)));
	}
}
