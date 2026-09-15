import { DefinedValue } from "@ac-kit/core";

import { IAsyncOrderedRange } from "../ordered-range/iasync-ordered-range.js";
import { SortedMapEntry } from "../ordered-range/iordered-range.js";
import { IAsyncMap } from "./iasync-map.js";

/** The async-backed sibling of {@link ISortedMap}. */
export interface IAsyncSortedMap<K, V extends DefinedValue>
	extends IAsyncMap<K, V>, IAsyncOrderedRange<SortedMapEntry<K, V>, K> {
	firstKey(signal?: AbortSignal): Promise<K | undefined>;
	lastKey(signal?: AbortSignal): Promise<K | undefined>;
	floorKey(key: K, signal?: AbortSignal): Promise<K | undefined>;
	ceilingKey(key: K, signal?: AbortSignal): Promise<K | undefined>;
}
