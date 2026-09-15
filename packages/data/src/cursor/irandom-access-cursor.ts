import { DefinedValue } from "@ac-kit/core";

import { IBidirectionalCursor } from "./ibidirectional-cursor.js";

/** A cursor over a sequence that also supports O(1) indexed positioning. */
export interface IRandomAccessCursor<
	T extends DefinedValue = DefinedValue,
> extends IBidirectionalCursor<T> {
	/** The index of this position. Equal to the sequence's `count()` past the end. */
	readonly index: number;

	/**
	 * Moves directly to the given index.
	 *
	 * @param index The index to move to. Negative counts from the end.
	 * @returns `false` if the index is out of bounds.
	 */
	seek(index: number): boolean;

	clone(): IRandomAccessCursor<T>;
}
