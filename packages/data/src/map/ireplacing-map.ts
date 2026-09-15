import { DefinedValue } from "@ac-kit/core";

import { IReplacing } from "../collection/ireplacing.js";
import { IMap } from "./imap.js";

/**
 * The sibling of {@link IMap} carrying {@link IReplacing}: never throws or waits
 * when a bounded map is full, replacing an existing entry under its own policy
 * (LRU/LFU/FIFO) instead of throwing, or skipping the incoming one.
 */
export interface IReplacingMap<K, V extends DefinedValue>
	extends IMap<K, V>, IReplacing {
	/**
	 * Same as `IMap.set`, but never throws — returns the entry displaced to make
	 * room (empty if nothing was displaced; under `"skip"`, the would-be-inserted
	 * entry itself).
	 *
	 * @see IMap.set
	 */
	set(key: K, value: V): readonly (readonly [K, V])[];
}
