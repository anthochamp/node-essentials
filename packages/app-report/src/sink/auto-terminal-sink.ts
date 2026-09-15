import type { Terminal } from "@ac-kit/app-terminal";

import type { ISink } from "../sink.js";
import {
	LiveRegionSink,
	type LiveRegionSinkOptions,
} from "./live-region-sink.js";
import { createPlainLineSink } from "./plain-line-sink.js";

export type AutoTerminalSinkOptions<TData> = Omit<
	LiveRegionSinkOptions<TData>,
	"terminal"
>;

/**
 * Selects {@link createPlainLineSink} or {@link LiveRegionSink} based on
 * `terminal.interactive` — the two P0 rendering sinks are given equal billing
 * here rather than one wrapping the other, since a live-region formatter
 * (progress bars, live tails) is typically not the same one wanted for a plain
 * non-interactive log.
 */
export function autoTerminalSink<TData>(
	stream: WritableStream<string>,
	terminal: Terminal,
	options: AutoTerminalSinkOptions<TData>,
): ISink<TData> {
	if (!terminal.interactive) {
		return createPlainLineSink<TData>(stream, { terminal });
	}

	return new LiveRegionSink<TData>(stream, { ...options, terminal });
}
