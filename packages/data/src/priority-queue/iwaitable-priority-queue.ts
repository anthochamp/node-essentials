import { DefinedValue } from "@ac-kit/core";

import { IBounded } from "../collection/ibounded.js";
import { IPriorityQueue } from "./ipriority-queue.js";

/**
 * The blocking sibling of {@link IBoundedPriorityQueue}: waits for capacity
 * instead of throwing when the queue is full. The inherited `insert` still
 * throws — this adds a way to wait, it does not change the way to fail.
 */
export interface IWaitablePriorityQueue<
	T extends DefinedValue = DefinedValue,
	P = number,
>
	extends IPriorityQueue<T, P>, IBounded {
	/**
	 * Same as `insert`, but waits for capacity if the operation would exceed it.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IPriorityQueue.insert
	 */
	waitInsert(priority: P, item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * Same as `insertAll`, but waits for capacity if the operation would exceed
	 * it. The whole batch lands at once, never interleaved with another
	 * waiter's.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IPriorityQueue.insertAll
	 */
	waitInsertAll(
		priority: P,
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void>;
}
