import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IQueue } from "./iqueue.js";

/**
 * The lossy sibling of {@link IQueue}: never throws or waits when a bounded
 * queue is full, evicting or skipping instead (`overflowPolicy`).
 *
 * `"evict"` drops the front (oldest) item to make room — the same victim
 * Python's `deque(maxlen=N)` and Boost's `circular_buffer` pick, and the only
 * meaningful choice for a FIFO structure.
 */
export interface ILossyQueue<T extends DefinedValue = DefinedValue>
	extends IQueue<T>, ILossy {
	/**
	 * Same as `IQueue.enqueue`, but never throws — returns the items dropped to
	 * make room (empty if nothing was dropped).
	 *
	 * @see IQueue.enqueue
	 */
	enqueue(item: T): readonly T[];

	/**
	 * Same as `IQueue.enqueueAll`, but never throws — returns the items dropped
	 * to make room (empty if nothing was dropped).
	 *
	 * @see IQueue.enqueueAll
	 */
	enqueueAll(items: readonly T[]): readonly T[];
}
