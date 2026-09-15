import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IDeque } from "./ideque.js";

/**
 * The lossy sibling of {@link IDeque}: never throws or waits when a bounded
 * deque is full, evicting or skipping instead (`overflowPolicy`).
 *
 * `"evict"` drops the end opposite the insertion — `push` (back) drops the
 * front, `unshift` (front) drops the back — mirroring Python's
 * `deque(maxlen=N)` and Boost's `circular_buffer`.
 */
export interface ILossyDeque<T extends DefinedValue = DefinedValue>
	extends IDeque<T>, ILossy {
	/**
	 * Same as `IDeque.unshift`, but never throws — returns the items dropped from
	 * the back to make room (empty if nothing was dropped).
	 *
	 * @see IDeque.unshift
	 */
	unshift(item: T): readonly T[];

	/**
	 * Same as `IDeque.unshiftAll`, but never throws — returns the items dropped
	 * from the back to make room (empty if nothing was dropped).
	 *
	 * @see IDeque.unshiftAll
	 */
	unshiftAll(items: readonly T[]): readonly T[];

	/**
	 * Same as `IDeque.push`, but never throws — returns the items dropped from
	 * the front to make room (empty if nothing was dropped).
	 *
	 * @see IDeque.push
	 */
	push(item: T): readonly T[];

	/**
	 * Same as `IDeque.pushAll`, but never throws — returns the items dropped from
	 * the front to make room (empty if nothing was dropped).
	 *
	 * @see IDeque.pushAll
	 */
	pushAll(items: readonly T[]): readonly T[];
}
