import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IPriorityQueue } from "./ipriority-queue.js";

/**
 * The lossy sibling of {@link IPriorityQueue}: never throws or waits when a
 * bounded priority queue is full, evicting or skipping instead
 * (`overflowPolicy`).
 *
 * `"evict"` drops the root — the same element `extract`/`peek` already expose.
 * To keep the N highest-priority items instead, construct with the inverse
 * ordering.
 */
export interface ILossyPriorityQueue<
	T extends DefinedValue = DefinedValue,
	P = number,
>
	extends IPriorityQueue<T, P>, ILossy {
	/**
	 * Same as `IPriorityQueue.insert`, but never throws — returns the items
	 * dropped to make room (empty if nothing was dropped).
	 *
	 * @see IPriorityQueue.insert
	 */
	insert(priority: P, item: T): readonly T[];

	/**
	 * Same as `IPriorityQueue.insertAll`, but never throws — returns the items
	 * dropped to make room (empty if nothing was dropped).
	 *
	 * @see IPriorityQueue.insertAll
	 */
	insertAll(priority: P, items: readonly T[]): readonly T[];
}
