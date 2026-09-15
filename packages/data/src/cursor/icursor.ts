import type { DefinedValue } from "@ac-kit/core";

/**
 * A stable position in a sequence, surviving across calls — the extra a plain
 * `Iterator` cannot offer, being single-pass, forward-only and positionless.
 *
 * The interface guarantees only that `valid` reports the truth; it does not
 * promise that a cursor survives a mutation of the sequence it was obtained
 * from. Invalidation rules are documented per implementing class.
 *
 * @template T The type of elements in the sequence. Anything except
 *   `undefined`.
 */
export interface ICursor<T extends DefinedValue = DefinedValue> {
	/** False once moved past the end, or once its element was removed. */
	readonly valid: boolean;

	/** The element at this position, `undefined` when not `valid`. */
	readonly value: T | undefined;

	/**
	 * Moves one position forward.
	 *
	 * @returns `false` if that moved past the end.
	 */
	advance(): boolean;

	/** An independent cursor at the same position. */
	clone(): ICursor<T>;
}
