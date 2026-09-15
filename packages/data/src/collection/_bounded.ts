import {
	BoundedOptions,
	CollectionCapacityExceededError,
	IBounded,
} from "./ibounded.js";

export function isBounded(value: unknown): value is IBounded {
	return typeof value === "object" && value !== null && "capacity" in value;
}

/**
 * Resolves the capacity a bounded collection was constructed with.
 *
 * Deliberately not generic over the storage: `BoundedOptions<TStorage>` is
 * invariant in `TStorage` (it occurs both as a property and inside an
 * intersection), so every caller would have to widen at the call site.
 *
 * @param itemCount How many items the initial iterable held.
 * @throws {RangeError} If the capacity is not a finite, non-negative number,
 *   exceeds what the supplied storage can hold, or is already smaller than the
 *   initial iterable.
 */
export function resolveBoundedCapacity(
	itemCount: number,
	options?: BoundedOptions<unknown>,
): number {
	const storageCapacity = isBounded(options?.storage)
		? options.storage.capacity
		: undefined;

	const capacity = options?.capacity ?? storageCapacity;

	if (capacity === undefined || !Number.isFinite(capacity) || capacity < 0) {
		throw new RangeError(
			`Capacity must be a non-negative, finite number, got ${capacity}`,
		);
	}
	if (storageCapacity !== undefined && capacity > storageCapacity) {
		throw new RangeError(
			`Capacity of ${capacity} exceeds the storage capacity of ${storageCapacity}`,
		);
	}
	if (itemCount > capacity) {
		throw new RangeError(
			`Initial iterable holds ${itemCount} items, exceeding the capacity of ${capacity}`,
		);
	}

	return capacity;
}

/**
 * The capacity check every `Bounded*` collection repeats before adding items.
 *
 * No permit bookkeeping: every collection in this package counts in O(1), so
 * asking it how full it is costs strictly less than mirroring its size in a
 * second counter that can drift.
 *
 * @throws {CollectionCapacityExceededError} If the collection cannot take that
 *   many more items.
 */
export function checkCapacity(
	count: number,
	added: number,
	capacity: number,
): void {
	if (count + added > capacity) {
		throw new CollectionCapacityExceededError(capacity);
	}
}
