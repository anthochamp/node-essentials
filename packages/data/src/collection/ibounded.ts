/** Error thrown when an insert would exceed a collection's capacity. */
export class CollectionCapacityExceededError extends Error {
	constructor(capacity: number) {
		super(`Collection capacity of ${capacity} exceeded`);
		this.name = "CollectionCapacityExceededError";
	}
}

/** A collection with a fixed maximum size, imposed at construction. */
export interface IBounded {
	/**
	 * The maximum number of elements the collection can hold.
	 *
	 * Note: `Infinity` is not a legal value here — an unbounded type omits this
	 * mixin.
	 */
	readonly capacity: number;
}

/**
 * Constructor options for a bounded collection.
 *
 * The capacity comes from exactly one of two places: the `capacity` option, or
 * a storage that carries its own (`FixedVector`, or any other `ICapacityBound`
 * storage). Having to state it in both places is what would otherwise force a
 * separate class per fixed-size collection; letting the storage answer for
 * itself makes `new BoundedQueue(undefined, { storage: new FixedVector(1024)
 * })` enough.
 *
 * Passing both is allowed, and then `capacity` must not exceed the storage's.
 *
 * @template TStorage The storage capability tier the collection requires.
 */
export type BoundedOptions<TStorage> =
	| { capacity: number; storage?: TStorage }
	| { capacity?: never; storage: TStorage & IBounded };
