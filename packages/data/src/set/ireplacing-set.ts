import { IReplacing } from "../collection/ireplacing.js";
import { ISet } from "./iset.js";

/**
 * The sibling of {@link ISet} carrying {@link IReplacing}: never throws or waits
 * when a bounded set is full, replacing an existing item under its own policy
 * (LRU/LFU/FIFO) instead of throwing, or skipping the incoming one.
 */
export interface IReplacingSet<T> extends ISet<T>, IReplacing {
	/**
	 * Same as `ISet.add`, but never throws — returns the items displaced to make
	 * room (empty if nothing was displaced).
	 *
	 * @see ISet["add"]
	 */
	add(item: T): readonly T[];

	/**
	 * Same as `ISet.addAll`, but never throws — returns the items displaced to
	 * make room (empty if nothing was displaced).
	 *
	 * @see ISet.addAll
	 */
	addAll(items: Iterable<T>): readonly T[];
}
