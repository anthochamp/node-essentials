/// <reference types="temporal-spec/global" />
import { Console } from "node:console";
import { EOL } from "node:os";
import { formatWithOptions, inspect, type InspectOptions } from "node:util";

import {
	captureStackTrace,
	defaults,
	joinNonEmpty,
	MaybeAsyncCallableNoArgs,
} from "@ac-kit/core";
import { Stack } from "@ac-kit/data";
import { renderTable } from "@ac-kit/format-monospace";
import type { FieldDescriptor, Value } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";

import { LogLevel } from "./log-level.js";
import type { Logger, LoggerScope } from "./logger.js";

// List of all `console` log methods
// https://console.spec.whatwg.org/#loglevel-severity
type ConsoleSinkLogMethod =
	// log
	| "log"
	| "trace"
	| "dir"
	| "dirxml"
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

// Map of `console` log methods to `LogLevel`
// https://console.spec.whatwg.org/#loglevel-severity
const CONSOLE_METHOD_TO_LOG_LEVEL = {
	log: "debug",
	trace: "debug",
	dir: "debug",
	dirxml: "debug",
	debug: "debug",
	timeLog: "debug",
	count: "info",
	info: "info",
	timeEnd: "info",
	warn: "warn",
	countReset: "warn",
	error: "error",
	assert: "error",
} as const satisfies Record<ConsoleSinkLogMethod, LogLevel>;

const CONSOLE_SINK_PATCHABLE_METHODS = [
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

/** Options for {@link ConsoleSink}. */
export type ConsoleSinkOptions = {
	/**
	 * Options to pass to `util.formatWithOptions` and `util.inspect` when
	 * formatting log messages.
	 *
	 * See:
	 * https://nodejs.org/api/util.html#util_util_formatwithoptions_inspect_options_args
	 */
	inspectOptions?: InspectOptions;

	/**
	 * Called by `clear()`, in addition to resetting counters/timers and closing
	 * open groups — `ConsoleSink` only holds a `Logger`, with no path back to an
	 * actual terminal to erase, so actually clearing one is the caller's job
	 * (e.g. `() => terminal.clear?.()`). Default: no-op.
	 */
	clear?: MaybeAsyncCallableNoArgs | null;
};

const CONSOLE_SINK_DEFAULT_OPTIONS: Required<ConsoleSinkOptions> = {
	inspectOptions: {},
	clear: null,
};

/**
 * A `Console` implementation backed by a `Logger`.
 *
 * Implements the standard `Console` interface
 * (https://console.spec.whatwg.org/) plus the Node.js extensions
 * (https://nodejs.org/api/console.html#console_console).
 *
 * `group()`/`groupCollapsed()` open a `Logger` scope (`scope-start`/
 * `scope-end` events) instead of maintaining a hand-rolled indentation stack —
 * any sink downstream of the `Logger` already knows how to nest/indent a
 * scope.
 */
export class ConsoleSink implements Console {
	private readonly options: Required<ConsoleSinkOptions>;
	private readonly nodeConsole = new Console(process.stdout, process.stderr);
	private readonly countMap = new Map<string, number>();
	private readonly timerTable = new Map<string, Temporal.Instant>();
	private readonly groupStack = new Stack<LoggerScope>();
	private readonly durationFormatter = new Intl.DurationFormat(undefined, {
		style: "narrow",
	});

	/**
	 * @param logger The logger to write to.
	 * @param options Optional settings for the console sink.
	 */
	constructor(
		private readonly logger: Logger,
		options?: ConsoleSinkOptions,
	) {
		this.options = defaults(options, CONSOLE_SINK_DEFAULT_OPTIONS);
	}

	/**
	 * Patches the methods of a target `Console` object to use the methods of a
	 * source `Console` object.
	 *
	 * This can be used to redirect the output of the global `console` object to
	 * an instance of `ConsoleSink`.
	 *
	 * Example: const consoleSink = new ConsoleSink(logger);
	 * ConsoleSink.patchConsole(console, consoleSink);
	 *
	 * @param target The target `Console` object to patch
	 * @param source The source `Console` object to use for the methods
	 */
	static patchConsole(target: Console, source: Console): void {
		for (const methodName of CONSOLE_SINK_PATCHABLE_METHODS) {
			// oxlint-disable-next-line typescript/no-explicit-any -- generic method-copy across the whole Console surface, no narrower shared shape exists
			(target as any)[methodName] = (source as any)[methodName].bind(source);
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

		this.print("assert", [message0.join(": "), ...messageRest]);
	}

	// https://console.spec.whatwg.org/#clear
	clear(): void {
		this.countMap.clear();
		this.timerTable.clear();

		while (this.groupStack.count() > 0) {
			this.groupEnd();
		}

		void this.options?.clear?.();
	}

	// https://console.spec.whatwg.org/#debug
	debug(...data: unknown[]): void {
		this.print("debug", data);
	}

	// https://console.spec.whatwg.org/#error
	error(...data: unknown[]): void {
		this.print("error", data);
	}

	// https://console.spec.whatwg.org/#info
	info(...data: unknown[]): void {
		this.print("info", data);
	}

	// https://console.spec.whatwg.org/#log
	log(...data: unknown[]): void {
		this.print("log", data);
	}

	// https://console.spec.whatwg.org/#table
	table(tabularData: unknown, properties?: string[]): void {
		if (tabularData === null || tabularData === undefined) {
			this.print("log", [tabularData]);
			return;
		}

		if (
			typeof tabularData !== "object" ||
			(Array.isArray(tabularData) && tabularData.length === 0) ||
			(!Array.isArray(tabularData) && Object.keys(tabularData).length === 0)
		) {
			this.print("log", ["(empty)"]);
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
			this.print("log", ["(empty)"]);
			return;
		}

		const allProperties = new Set<string>();
		for (const row of rows) {
			for (const key of Object.keys(row)) {
				allProperties.add(key);
			}
		}

		const selectedProperties = properties
			? properties.filter((property) => allProperties.has(property))
			: Array.from(allProperties);

		const frame = dataFrameFromRows(
			selectedProperties.map((property): FieldDescriptor => ({
				name: property,
				kind: "nominal",
			})),
			rows.map((row) =>
				selectedProperties.map((property): Value => {
					const value = row[property];
					return value === undefined
						? ""
						: inspect(value, this.options.inspectOptions);
				}),
			),
		);

		this.print("log", [renderTable(frame, { border: "ascii" })]);
	}

	// https://console.spec.whatwg.org/#trace
	trace(...data: unknown[]): void {
		const message = [
			joinNonEmpty(["Trace", this.format(data)], ": "),
			// oxlint-disable-next-line typescript/unbound-method -- stack-capture reference point, never called unbound
			...captureStackTrace({ reference: this.trace }),
		].join(EOL);

		this.activeLogger.log("debug", message);
	}

	// https://console.spec.whatwg.org/#warn
	warn(...data: unknown[]): void {
		this.print("warn", data);
	}

	// https://console.spec.whatwg.org/#dir
	dir(item: unknown, options?: InspectOptions): void {
		this.printOne("dir", item, options);
	}

	// https://console.spec.whatwg.org/#dirxml
	dirxml(...data: unknown[]): void {
		this.print("dirxml", data);
	}

	//
	// COUNTING FUNCTIONS
	// https://console.spec.whatwg.org/#counting
	//

	// https://console.spec.whatwg.org/#count
	count(label: string): void {
		const count = (this.countMap.get(label) ?? 0) + 1;
		this.countMap.set(label, count);

		this.print("count", [`${label}: ${count}`]);
	}

	// https://console.spec.whatwg.org/#countreset
	countReset(label: string): void {
		if (this.countMap.has(label)) {
			this.countMap.delete(label);
			return;
		}

		this.print("countReset", [`Counter '${label}' does not exist`]);
	}

	//
	// GROUPING FUNCTIONS
	// https://console.spec.whatwg.org/#grouping
	//

	// https://console.spec.whatwg.org/#group
	group(...data: unknown[]): void {
		const label = data.length === 0 ? "Group" : this.format(data);
		this.groupStack.push(this.activeLogger.scope(label));
	}

	// https://console.spec.whatwg.org/#groupcollapsed
	groupCollapsed(...data: unknown[]): void {
		this.group(...data);
	}

	// https://console.spec.whatwg.org/#groupend
	groupEnd(): void {
		const scope = this.groupStack.pop();
		if (scope !== undefined) {
			void scope[Symbol.asyncDispose]();
		}
	}

	//
	// TIMING FUNCTIONS
	// https://console.spec.whatwg.org/#timing
	//

	// https://console.spec.whatwg.org/#time
	time(label: string): void {
		if (this.timerTable.has(label)) {
			this.print("warn", [`Timer '${label}' already exists`]);
			return;
		}
		this.timerTable.set(label, Temporal.Now.instant());
	}

	// https://console.spec.whatwg.org/#timelog
	timeLog(label: string, ...data: unknown[]): void {
		const startTime = this.timerTable.get(label);
		if (startTime === undefined) {
			this.print("warn", [`Timer '${label}' does not exist`]);
			return;
		}
		const duration = this.durationFormatter.format(
			Temporal.Now.instant().since(startTime),
		);
		this.print("timeLog", [`${label}: ${duration}`, ...data]);
	}

	// https://console.spec.whatwg.org/#timeend
	timeEnd(label: string): void {
		const startTime = this.timerTable.get(label);
		if (startTime === undefined) {
			this.print("warn", [`Timer '${label}' does not exist`]);
			return;
		}
		const duration = this.durationFormatter.format(
			Temporal.Now.instant().since(startTime),
		);
		this.timerTable.delete(label);
		this.print("timeEnd", [`${label}: ${duration}`]);
	}

	//
	// NODE.JS EXTENSIONS
	// https://nodejs.org/api/console.html#console_console
	//

	Console: Console["Console"] = Console;

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

	/** The innermost open group's scope, or the root logger if none is open. */
	private get activeLogger(): Logger {
		return this.groupStack.top() ?? this.logger;
	}

	// https://console.spec.whatwg.org/#formatter
	private format(data: unknown[]): string {
		return formatWithOptions(this.options.inspectOptions, ...data);
	}

	// https://console.spec.whatwg.org/#logger
	private print(method: ConsoleSinkLogMethod, data: unknown[]): void {
		if (data.length === 0) {
			return;
		}

		const [first, ...rest] = data;

		if (rest.length === 0) {
			this.printOne(method, first);
		} else {
			this.printOne(method, this.format(data));
		}
	}

	// https://console.spec.whatwg.org/#printer
	private printOne(
		method: ConsoleSinkLogMethod,
		data: unknown,
		options?: InspectOptions,
	): void {
		let message: string;
		let attributes: Record<string, unknown> | undefined;

		if (typeof data === "string") {
			message = data;
		} else {
			message = inspect(data, defaults(options, this.options.inspectOptions));
			attributes = { data };
		}

		this.activeLogger.log(CONSOLE_METHOD_TO_LOG_LEVEL[method], message, {
			attributes,
		});
	}
}
