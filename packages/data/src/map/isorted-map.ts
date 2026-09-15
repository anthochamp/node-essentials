import { DefinedValue } from "@ac-kit/core";

import {
	IOrderedRange,
	SortedMapEntry,
} from "../ordered-range/iordered-range.js";
import { IMap } from "./imap.js";

/**
 * A map whose iteration order is the comparator's, queried and iterated by key.
 *
 * `floor`/`ceiling`/`range`/`min`/`max` are inherited from
 * {@link IOrderedRange}, returning whole entries — matching Java's
 * `floorEntry`/`ceilingEntry`/`subMap`. `firstKey`/`lastKey`/`floorKey`/
 * `ceilingKey` are thin, key-only conveniences on top, for the common case
 * where the caller wants just the key.
 */
export interface ISortedMap<K, V extends DefinedValue>
	extends IMap<K, V>, IOrderedRange<SortedMapEntry<K, V>, K> {
	/** Sugar over `min()?.key`. */
	firstKey(): K | undefined;
	/** Sugar over `max()?.key`. */
	lastKey(): K | undefined;
	/** Sugar over `floor(key)?.key`. */
	floorKey(key: K): K | undefined;
	/** Sugar over `ceiling(key)?.key`. */
	ceilingKey(key: K): K | undefined;
}
