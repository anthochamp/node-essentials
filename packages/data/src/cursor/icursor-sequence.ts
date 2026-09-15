import type { DefinedValue } from "@ac-kit/core";

import { ICursor } from "./icursor.js";

/**
 * Forward-only cursor editing — the shape a singly-linked list can honour.
 *
 * @template T The type of elements in the sequence. Anything except
 *   `undefined`.
 * @template C The cursor type this sequence produces.
 */
export interface ICursorSequence<
	T extends DefinedValue = DefinedValue,
	C extends ICursor<T> = ICursor<T>,
> {
	/** The first element; invalid when empty. */
	begin(): C;

	/** The past-the-end position, used to append. */
	end(): C;

	/** O(1) for random-access backings, O(n) otherwise. */
	cursorAt(index: number): C;

	/**
	 * Inserts an item after `cursor`. O(1).
	 *
	 * @param cursor The position after which to insert.
	 * @param item The item to insert.
	 */
	insertAfter(cursor: C, item: T): void;

	/**
	 * Inserts every item after `cursor`, keeping their relative order. O(n) in
	 * the number of items.
	 *
	 * @param cursor The position after which to insert.
	 * @param items The items to insert.
	 */
	insertAllAfter(cursor: C, items: readonly T[]): void;

	/**
	 * Removes the element after `cursor`. O(1). Cursors at the removed element
	 * become invalid.
	 *
	 * @param cursor The position before the element to remove.
	 * @returns The removed element, or `undefined` if there was none.
	 */
	removeAfter(cursor: C): T | undefined;

	/**
	 * Replaces the element at `cursor`.
	 *
	 * @param cursor The position to replace.
	 * @param item The new item.
	 */
	setAt(cursor: C, item: T): void;
}
