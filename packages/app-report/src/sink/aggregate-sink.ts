import { Callable } from "@ac-kit/core";

import type { ReportEvent } from "../events.js";
import type { ISink } from "../sink.js";
import { MemorySink, RunSnapshot } from "./memory-sink.js";

/** Renders an entire run's snapshot once, at close. */
export type AggregateFormatter<TData> = Callable<
	[run: RunSnapshot<TData>],
	string
>;

export type AggregateSinkOptions<TData> = {
	formatter: AggregateFormatter<TData>;
};

/**
 * Renders one {@link AggregateFormatter} output at `close()`, over everything
 * observed during the run — the run-end counterpart to `WritableStreamSink`'s
 * per-event streaming.
 */
export class AggregateSink<TData> implements ISink<TData> {
	private readonly memory = new MemorySink<TData>();
	private readonly formatter: AggregateFormatter<TData>;
	private readonly writer: WritableStreamDefaultWriter<string>;

	constructor(
		stream: WritableStream<string>,
		options: AggregateSinkOptions<TData>,
	) {
		this.writer = stream.getWriter();
		this.formatter = options.formatter;
	}

	write(event: ReportEvent<TData>, signal?: AbortSignal): void {
		signal?.throwIfAborted();
		this.memory.write(event);
	}

	/** Waits for the writer to catch up with backpressure. */
	async flush(): Promise<void> {
		await this.writer.ready;
	}

	async close(signal?: AbortSignal): Promise<void> {
		signal?.throwIfAborted();
		await this.writer.write(this.formatter(this.memory.snapshot()));
		await this.writer.close();
	}
}
