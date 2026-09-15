import { DefinedValue } from "@ac-kit/core";

import { IStackStorage } from "../stack/istack-storage.js";
import { IIndexedStorage } from "../storage/iindexed-storage.js";

export type HeapStorage<T extends DefinedValue> = IStackStorage<T> &
	IIndexedStorage<T>;
