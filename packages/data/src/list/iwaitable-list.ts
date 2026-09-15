import { DefinedValue } from "@ac-kit/core";

import { IBounded } from "../collection/ibounded.js";
import { IList } from "./ilist.js";

/**
 * The blocking sibling of {@link IList}: waits for capacity instead of throwing
 * when the list is full. The inherited `set`/`splice` throws — this adds a way
 * to wait, it does not change the way to fail.
 */
export interface IWaitableList<T extends DefinedValue = DefinedValue>
	extends IList<T>, IBounded {
	/**
	 * Same as `set`, but waits for capacity if the operation would exceed it.
	 *
	 * When `index` equals the list's length (an append), the append lands at
	 * whatever the list's length turns out to be once capacity frees up — not
	 * necessarily the length at call time — since another caller may have mutated
	 * the list while this call was waiting. A non-appending `index` gives no such
	 * guarantee: if another caller changes the list's shape while this call
	 * waits, the eventual write still targets the originally requested numeric
	 * position, which may no longer mean what it did at call time.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IList.set
	 */
	waitSet(index: number, item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * The same as `splice`, but waits for capacity if the operation would exceed
	 * it.
	 *
	 * Same concurrent-mutation caveat as `waitSet`: when `start` equals the
	 * list's length at call time (an append via `splice`), the insert lands at
	 * whatever the list's length turns out to be once capacity frees up. A
	 * `start` that does not equal the list's length gives no such guarantee.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IList.splice
	 */
	waitSplice(
		start: number,
		deleteCount?: number,
		item?: T,
		signal?: AbortSignal | null,
	): Promise<IterableIterator<T>>;

	/**
	 * The same as `spliceAll`, but waits for capacity if the operation would
	 * exceed it. Same concurrent-mutation caveat as `waitSplice`.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IList.spliceAll
	 */
	waitSpliceAll(
		start: number,
		deleteCount?: number,
		items?: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<IterableIterator<T>>;
}
