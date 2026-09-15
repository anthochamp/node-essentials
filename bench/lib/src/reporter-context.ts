import { createWriteStream } from "node:fs";
import { Writable } from "node:stream";

import type { MeasureRegistry, ReporterContext } from "@ac-bench/core/plugin";
import { nodeTerminal } from "@ac-kit/app-system";
import type { Terminal } from "@ac-kit/app-terminal";
import { nonClosingWritableStream } from "@ac-kit/node";

export type ReporterContextOptions = {
	readonly registry: MeasureRegistry;
	/** Base name for output files, for a reporter given no explicit one. */
	readonly defaultOutput: string;
	/** Defaults to `process.stdout`, wrapped so a sink cannot close it. */
	readonly stdout?: WritableStream<string>;
	/** Defaults to whatever `process.stdout` reports. */
	readonly terminal?: Terminal;

	/** Show what a run normally hides: child output, full stack traces. */
	readonly verbose?: boolean;
};

/**
 * Assembles the host-bound half of reporting, so a reporter package needs no
 * `node:` import of its own.
 */
export function createReporterContext(
	options: ReporterContextOptions,
): ReporterContext {
	return {
		registry: options.registry,
		terminal: options.terminal ?? nodeTerminal(process.stdout),
		defaultOutput: options.defaultOutput,
		verbose: options.verbose === true,
		// Never closes process.stdout — closing a TTY-backed WHATWG writable never
		// resolves.
		stdout: options.stdout ?? nonClosingWritableStream(process.stdout),
		openOutput: (fileName) =>
			Writable.toWeb(createWriteStream(fileName)) as WritableStream<string>,
	};
}
