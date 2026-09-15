import { DefinedValue } from "@ac-kit/core";

import { IBounded } from "../collection/ibounded.js";
import { IQueue } from "./iqueue.js";

/**
 * The blocking sibling of {@link IQueue}: waits for capacity instead of throwing
 * when the queue is full. The inherited `enqueue` throws — this adds a way to
 * wait, it does not change the way to fail.
 */
export interface IWaitableQueue<T extends DefinedValue = DefinedValue>
	extends IQueue<T>, IBounded {
	/**
	 * Same as `enqueue`, but waits for capacity if the operation would exceed it.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IQueue.enqueue
	 */
	waitEnqueue(item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * Same as `enqueueAll`, but waits for capacity if the operation would exceed
	 * it. The whole batch lands at once, never interleaved with another
	 * waiter's.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IQueue.enqueueAll
	 */
	waitEnqueueAll(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void>;
}
