import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IHeap } from "./iheap.js";

/**
 * The lossy sibling of {@link IHeap}: never throws or waits when a bounded heap
 * is full, evicting or skipping instead (`overflowPolicy`).
 *
 * `"evict"` drops the root — the same element `extract`/`peek` already expose,
 * since a heap has no ends to pick a victim from. To keep the N greatest
 * instead, construct with the inverse ordering.
 */
export interface ILossyHeap<T extends DefinedValue = DefinedValue>
	extends IHeap<T>, ILossy {
	/**
	 * Same as `IHeap.insert`, but never throws — returns the items dropped to
	 * make room (empty if nothing was dropped).
	 *
	 * @see IHeap.insert
	 */
	insert(item: T): readonly T[];

	/**
	 * Same as `IHeap.insertAll`, but never throws — returns the items dropped to
	 * make room (empty if nothing was dropped).
	 *
	 * @see IHeap.insertAll
	 */
	insertAll(items: readonly T[]): readonly T[];
}
