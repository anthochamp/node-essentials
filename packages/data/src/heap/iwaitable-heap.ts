import { DefinedValue } from "@ac-kit/core";

import { IBounded } from "../collection/ibounded.js";
import { IHeap } from "./iheap.js";

/**
 * The blocking sibling of {@link IHeap}: waits for capacity when the heap is
 * full. The inherited `insert` throws — this adds a way to wait, it does not
 * change the way to fail.
 */
export interface IWaitableHeap<T extends DefinedValue = DefinedValue>
	extends IHeap<T>, IBounded {
	/**
	 * Same as `insert`, but waits for capacity if the operation would exceed it.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IHeap.insert
	 */
	waitInsert(item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * Same as `insertAll`, but waits for capacity if the operation would exceed
	 * it. The whole batch lands at once, never interleaved with another
	 * waiter's.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IHeap.insertAll
	 */
	waitInsertAll(items: Iterable<T>, signal?: AbortSignal | null): Promise<void>;
}
