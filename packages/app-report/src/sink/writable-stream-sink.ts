import type { Terminal } from "@ac-kit/app-terminal";

import { ReportEvent } from "../events.js";
import { Formatter } from "../formatter.js";
import { ISink } from "../sink.js";
import { ScopeTracker } from "../util/scope-tracker.js";

export type WritableStreamSinkOptions<TData> = {
	formatter: Formatter<TData>;
	terminal?: Terminal;
	/** Appended after every non-`null` formatted line. Default `"\n"`. */
	eol?: string;
};

/**
 * Renders through a {@link Formatter} into a Web `WritableStream<string>`.
 *
 * Portable — the Node adapter is `Writable.toWeb`. Applies backpressure by
 * awaiting the writer, so an `AsyncQueueSink` in front of this one is the
 * recommended way to decouple a slow destination, rather than buffering
 * internally here too.
 */
export class WritableStreamSink<TData> implements ISink<TData> {
	private readonly scopeTracker = new ScopeTracker();
	private readonly writer: WritableStreamDefaultWriter<string>;
	private readonly formatter: Formatter<TData>;
	private readonly terminal: Terminal | undefined;
	private readonly eol: string;

	constructor(
		stream: WritableStream<string>,
		options: WritableStreamSinkOptions<TData>,
	) {
		this.writer = stream.getWriter();
		this.formatter = options.formatter;
		this.terminal = options.terminal;
		this.eol = options.eol ?? "\n";
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		this.scopeTracker.observe(event);

		const line = this.formatter(event, {
			scopes: this.scopeTracker,
			terminal: this.terminal,
		});

		if (line === null) {
			return;
		}

		signal?.throwIfAborted();
		await this.writer.write(line + this.eol);
	}

	/** Waits for the writer to catch up with backpressure. */
	async flush(): Promise<void> {
		await this.writer.ready;
	}

	async close(): Promise<void> {
		await this.writer.close();
	}
}
