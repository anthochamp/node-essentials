/**
 * Interface representing a collection of elements.
 *
 * Throughout this hierarchy `undefined` means "there is no element" — it is
 * what `get`, `front`, `back`, `peek`, `top`, `root`, `shift`, `pop`, `dequeue`
 * and `extract` return when there is nothing to return. Elements therefore
 * cannot be `undefined` themselves, which {@link DefinedValue} enforces. Use
 * `null` for an element that means nothing.
 *
 * @template T The type of elements in the collection. Anything except
 *   `undefined`.
 */
export interface ICollection<T> extends Iterable<T> {
	/**
	 * The number of elements in the collection.
	 *
	 * A method, not a getter: its async counterpart needs a round trip to the
	 * backing store, and a member must have the same shape in both.
	 */
	count(): number;

	/** Removes all elements from the collection. */
	clear(): void;
}
