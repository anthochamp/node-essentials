import { QueueReceiver, Signal } from "@ac-kit/async";
import type { IQueue } from "@ac-kit/data";
import { BlockingQueue, BoundedQueue, LossyQueue } from "@ac-kit/data";

import type { ReportEvent } from "../events.js";
import type { ISink, SinkProbe } from "../sink.js";

/**
 * What happens to a write once the internal queue reaches `maxQueue`.
 *
 * `"block"` and `"error"` map onto `Queue` (`waitEnqueue`/`enqueue`);
 * `"drop-oldest"` and `"drop"` map onto `LossyQueue` (`overflowPolicy`
 * `"evict"`/`"skip"`) — one `@ac-kit/data` type per policy rather than
 * hand-rolling the overflow behaviour here.
 */
export type AsyncQueueSinkOverflow = "block" | "drop-oldest" | "drop" | "error";

export type AsyncQueueSinkOptions<TData> = {
	/** Maximum number of buffered events. Default `4096`. */
	maxQueue?: number;

	/** Default `"drop-oldest"`. */
	overflow?: AsyncQueueSinkOverflow;

	/**
	 * Called with the events dropped by a `"drop-oldest"`/`"drop"` write — never
	 * called under `"block"` (nothing is ever dropped) or `"error"` (the write
	 * throws instead of dropping).
	 */
	onOverflow?: (dropped: readonly ReportEvent<TData>[]) => void;

	/**
	 * Called when the wrapped sink's `write()` rejects — the drain loop keeps
	 * draining regardless. Without this, a failure is only ever observed at
	 * `close()` time (via its rejection), long after the fact.
	 */
	onSinkError?: (error: unknown) => void;
};

/**
 * Decouples the emitter from a slow sink via a bounded, background-drained
 * queue.
 *
 * Overflow is handled by position, never by importance: a full queue drops the
 * oldest or the newest event, blocks, or throws, according to its policy. There
 * is deliberately no "shed the least important first" option, because a generic
 * {@link ReportEvent} carries no severity — only {@link SinkProbe} does — and
 * severity is a per-domain concept (a logger assigns one; a subprocess exit
 * code has none), so there is no extractor to fall back on. A caller who needs
 * it can filter before enqueueing, where the domain is still known.
 */
export class AsyncQueueSink<TData> implements ISink<TData> {
	/**
	 * Only for `count` in `flush`/`close` — both `Queue` and `LossyQueue` satisfy
	 * `IQueue`; the enqueue side (which does need to tell them apart, to reach
	 * `waitEnqueue` or read the evicted items) is resolved once below into
	 * `enqueueEvent`, never re-discriminated per call.
	 */
	private readonly queue: IQueue<ReportEvent<TData>>;
	private readonly receiver: QueueReceiver<ReportEvent<TData>>;
	private readonly enqueueEvent: (
		event: ReportEvent<TData>,
		signal?: AbortSignal,
	) => Promise<void>;
	/** Signalled whenever the queue is empty; reset the moment it is not. */
	private readonly drained = new Signal(false, true);
	private readonly closeController = new AbortController();
	private readonly drainLoop: Promise<void>;
	private readonly onSinkError: ((error: unknown) => void) | undefined;
	private closing = false;

	constructor(
		private readonly sink: ISink<TData>,
		options?: AsyncQueueSinkOptions<TData>,
	) {
		const maxQueue = options?.maxQueue ?? 4096;
		const overflow = options?.overflow ?? "drop-oldest";
		const onOverflow = options?.onOverflow;
		this.onSinkError = options?.onSinkError;

		switch (overflow) {
			case "block": {
				const queue = new BlockingQueue<ReportEvent<TData>>(undefined, {
					capacity: maxQueue,
				});
				this.queue = queue;
				this.enqueueEvent = (event, signal) => queue.waitEnqueue(event, signal);
				break;
			}

			case "error": {
				const queue = new BoundedQueue<ReportEvent<TData>>(undefined, {
					capacity: maxQueue,
				});
				this.queue = queue;
				this.enqueueEvent = async (event) => {
					queue.enqueue(event);
				};
				break;
			}

			case "drop-oldest":
			case "drop": {
				const queue = new LossyQueue<ReportEvent<TData>>(undefined, {
					capacity: maxQueue,
					overflowPolicy: overflow === "drop-oldest" ? "evict" : "skip",
				});
				this.queue = queue;
				this.enqueueEvent = async (event) => {
					const dropped = queue.enqueue(event);
					if (dropped.length > 0) {
						onOverflow?.(dropped);
					}
				};
				break;
			}
		}

		this.receiver = new QueueReceiver(this.queue);
		this.drainLoop = this.runDrainLoop();
	}

	enabled(probe: SinkProbe): boolean {
		return this.sink.enabled?.(probe) ?? true;
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		if (this.closing) {
			throw new Error("AsyncQueueSink is closing");
		}

		// Reset synchronously, before any await: an `enqueueEvent` that resolves
		// without truly suspending (every policy but "block", when under
		// capacity) still forces at least one microtask tick between this line
		// and the next, which is enough for a concurrent `flush()`/`close()`
		// call to see a stale "already drained" state if this happened after.
		this.drained.reset();

		try {
			await this.enqueueEvent(event, signal);
		} catch (error) {
			// Nothing actually landed in the queue (`"error"` policy at
			// capacity, or an aborted `"block"` wait). If nothing else is
			// pending either, there is nothing left to drain.
			if (this.queue.count() === 0) {
				this.drained.signal();
			}

			throw error;
		}

		this.receiver.notify();
	}

	/**
	 * Waits until every event written so far has reached the wrapped sink.
	 *
	 * Races against the drain loop itself: without `onSinkError`, a crashed drain
	 * loop never signals `drained`, and waiting on it alone would hang forever
	 * instead of surfacing the crash.
	 */
	async flush(signal?: AbortSignal): Promise<void> {
		await Promise.race([this.drained.wait(signal), this.drainLoop]);
		await this.sink.flush(signal);
	}

	/** Drains the queue, then closes the wrapped sink. */
	async close(signal?: AbortSignal): Promise<void> {
		this.closing = true;
		await Promise.race([this.drained.wait(signal), this.drainLoop]);
		this.closeController.abort();
		await this.drainLoop;
		await this.sink.close(signal);
	}

	private async runDrainLoop(): Promise<void> {
		while (true) {
			let item: ReportEvent<TData>;

			try {
				item = await this.receiver.receive(this.closeController.signal);
			} catch {
				// Only `close()` aborts this signal, and only once the queue is
				// already drained — nothing left to do.
				return;
			}

			try {
				await this.sink.write(item);
			} catch (error) {
				if (!this.onSinkError) {
					throw error;
				}

				this.onSinkError(error);
			}

			if (this.queue.count() === 0) {
				this.drained.signal();
			}
		}
	}
}
