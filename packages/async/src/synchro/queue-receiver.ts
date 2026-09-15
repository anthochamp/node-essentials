import type { DefinedValue } from "@ac-kit/core";
import type { IQueue } from "@ac-kit/data";

import { Signal } from "./signal.js";

/**
 * Adapts an `@ac-kit/data` `IQueue`'s synchronous, non-blocking `dequeue()`
 * into an async one that waits for an item instead of returning `undefined`.
 *
 * The producer side is the caller's choice — `Queue.enqueue`,
 * `Queue.waitEnqueue`, a `LossyQueue`'s evicting `enqueue`, or anything else
 * that ends up calling the same queue's `dequeue()` — this class only adapts
 * the consumer side. Call {@link QueueReceiver.notify} after every enqueue so a
 * pending {@link QueueReceiver.receive} wakes up; a missed `notify` is not lost
 * (the underlying `Signal` is level-triggered, not edge-triggered), so calling
 * it unconditionally after every enqueue attempt — successful or not — is
 * always safe.
 *
 * Assumes a single reader: concurrent `receive()` calls would race on which one
 * gets which `dequeue()` result, same as calling `dequeue()` directly from two
 * tasks would.
 *
 * @template T The type of elements in the queue. Anything except `undefined`.
 */
export class QueueReceiver<T extends DefinedValue> {
	private readonly doorbell = new Signal(true);

	constructor(private readonly queue: IQueue<T>) {}

	/** Wakes a pending {@link receive}. Call after every enqueue. */
	notify(): void {
		this.doorbell.signal();
	}

	/**
	 * Waits for and returns the next item, dequeuing it.
	 *
	 * @param signal An optional abort signal to cancel the wait.
	 */
	async receive(signal?: AbortSignal | null): Promise<T> {
		while (true) {
			const item = this.queue.dequeue();

			if (item !== undefined) {
				return item;
			}

			await this.doorbell.wait(signal);
		}
	}
}
