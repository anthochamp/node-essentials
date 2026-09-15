import { AsyncQueueSink, ISink, ReportEvent } from "@ac-kit/app-report";
import { Callable } from "@ac-kit/core";

import { LogLevel } from "./log-level.js";
import { LogRecord } from "./log-record.js";
import { LoggerOptions } from "./logger-options-from-env.js";

/** Shared, mutable state for one logger tree — the sink, the queue, the clock. */
export class LoggerCore {
	private readonly queuedSink: AsyncQueueSink<LogRecord>;
	private readonly onSinkError: Callable<[error: unknown]> | undefined;

	readonly minLevel: LogLevel;
	readonly captureStackAtOrBelow: LogLevel | null;
	readonly clock: () => number;

	constructor(sink: ISink<LogRecord>, options?: LoggerOptions) {
		this.onSinkError = options?.onSinkError;
		this.queuedSink = new AsyncQueueSink(sink, {
			onSinkError: this.onSinkError,
		});
		this.minLevel = options?.minLevel ?? "info";
		this.captureStackAtOrBelow = options?.captureStackAtOrBelow ?? null;
		this.clock = options?.clock ?? Date.now;
	}

	/**
	 * Enqueues an event without ever throwing back into the (synchronous) caller
	 * — failures (sink or queue-overflow) surface through `onSinkError` instead.
	 */
	writeEvent(event: ReportEvent<LogRecord>): void {
		void this.queuedSink.write(event).catch((error: unknown) => {
			this.onSinkError?.(error);
		});
	}

	async flush(signal?: AbortSignal): Promise<void> {
		await this.queuedSink.flush(signal);
	}

	async close(signal?: AbortSignal): Promise<void> {
		await this.queuedSink.close(signal);
	}
}
