import { DefinedValue } from "@ac-kit/core";

import { IDequeStorage } from "../deque/ideque-storage.js";
import { IIndexedStorage } from "../storage/iindexed-storage.js";

/**
 * The only tier satisfied in O(1) throughout is `CircularArrayList` among the
 * lists, and `RingVector`/`FixedVector` among the plain storages.
 */
export type IListStorage<T extends DefinedValue> = IDequeStorage<T> &
	IIndexedStorage<T>;
