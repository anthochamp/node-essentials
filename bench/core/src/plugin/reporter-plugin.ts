import type { ISink } from "@ac-kit/app-report";
import type { Terminal } from "@ac-kit/app-terminal";
import { isObject } from "@ac-kit/core";

import type { MeasureData } from "../common/measure-data.js";
import type { MeasureRegistry } from "./registry.js";

/**
 * Everything a reporter needs that belongs to the run rather than to the
 * reporter: the host's streams, the run's environment, and the registry that
 * turns an opaque result into something renderable.
 *
 * Handing these in is what keeps a reporter package free of `node:` imports —
 * the host-bound half is assembled once, by whoever starts the run.
 */
export type ReporterContext = {
	/**
	 * The registry that resolves a measure id to its plugin, so the reporter can
	 * render the results.
	 */
	readonly registry: MeasureRegistry;

	/** The terminal the run is using, so the reporter can write to it. */
	readonly terminal: Terminal;

	/** Base name for output files, for a reporter given no explicit one. */
	readonly defaultOutput: string;

	/** The process's own output stream. A sink must never close it. */
	readonly stdout: WritableStream<string>;

	/**
	 * The run was asked to show everything it normally hides — a child's output,
	 * an error's stack. A reporter with nothing extra to show ignores it.
	 */
	readonly verbose?: boolean;

	/** Opens a file for writing, relative to the run's working directory. */
	openOutput(fileName: string): WritableStream<string>;
};

/**
 * Brands a `ReporterPlugin` so `isReporterPlugin` can check for it nominally
 * instead of validating every member's shape — only `defineReporterPlugin` ever
 * attaches it.
 */
export const REPORTER_PLUGIN_TAG: unique symbol = Symbol("ReporterPlugin");

export type ReporterPluginSpec = {
	/** Selects this reporter from a config file or `--reporter`. */
	readonly id: string;
	/**
	 * Builds this reporter's sink for one run.
	 *
	 * Synchronous: `openOutput` hands over an already-open stream, so no reporter
	 * has anything to await before its sink exists.
	 */
	createSink(context: ReporterContext): ISink<MeasureData>;
};

export type ReporterPlugin = ReporterPluginSpec & {
	readonly [REPORTER_PLUGIN_TAG]: true;
};

export function isReporterPlugin(value: unknown): value is ReporterPlugin {
	return isObject(value) && REPORTER_PLUGIN_TAG in value;
}

/**
 * Brands a reporter spec as a `ReporterPlugin`.
 *
 * A reporter carries no options of its own: whatever it needs is applied where
 * the plugin is constructed, so a package with options default-exports a
 * factory returning this, and one without default-exports the result directly.
 */
export function defineReporterPlugin(spec: ReporterPluginSpec): ReporterPlugin {
	return { ...spec, [REPORTER_PLUGIN_TAG]: true };
}
