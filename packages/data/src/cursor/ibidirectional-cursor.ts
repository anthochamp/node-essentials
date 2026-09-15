import { DefinedValue } from "@ac-kit/core";

import { ICursor } from "./icursor.js";

/** A cursor over a sequence that can also be walked backward. */
export interface IBidirectionalCursor<
	T extends DefinedValue = DefinedValue,
> extends ICursor<T> {
	/**
	 * Moves one position back.
	 *
	 * @returns `false` if that moved before the start.
	 */
	retreat(): boolean;

	clone(): IBidirectionalCursor<T>;
}
