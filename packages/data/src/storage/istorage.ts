/**
 * Describes a generic storage interface with O(1) operations.
 *
 * Storage is described by what it can do in O(1), not by an ADT. These
 * capability interfaces are orthogonal, not a chain: `ArrayList` has O(1)
 * indexing but O(n) `popFront`, while `DoublyLinkedList` is fully double-ended
 * but has O(n) indexing.
 */
export interface IStorage<T> extends Iterable<T> {
	count(): number;
	clear(): void;
}
