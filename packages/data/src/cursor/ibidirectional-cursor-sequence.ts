import { DefinedValue } from "@ac-kit/core";

import { IBidirectionalCursor } from "./ibidirectional-cursor.js";
import { ICursorSequence } from "./icursor-sequence.js";

/** Adds the operations that need a predecessor, i.e. a back link or an index. */
export interface IBidirectionalCursorSequence<
	T extends DefinedValue = DefinedValue,
	C extends IBidirectionalCursor<T> = IBidirectionalCursor<T>,
> extends ICursorSequence<T, C> {
	/**
	 * Inserts an item before `cursor`. O(1).
	 *
	 * @param cursor The position before which to insert.
	 * @param item The item to insert.
	 */
	insertBefore(cursor: C, item: T): void;

	/**
	 * Inserts every item before `cursor`, keeping their relative order. O(n) in
	 * the number of items.
	 *
	 * @param cursor The position before which to insert.
	 * @param items The items to insert.
	 */
	insertAllBefore(cursor: C, items: readonly T[]): void;

	/**
	 * Removes the element at `cursor`. O(1). Cursors at the removed element
	 * become invalid.
	 *
	 * @param cursor The position to remove.
	 * @returns The removed element, or `undefined` if `cursor` was not valid.
	 */
	removeAt(cursor: C): T | undefined;
}
