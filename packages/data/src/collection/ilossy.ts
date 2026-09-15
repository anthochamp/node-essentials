import type { IBounded } from "./ibounded.js";

/**
 * Overflow policy for bounded collections.
 *
 * - `"evict"` drops an existing element to make room.
 * - `"skip"` drops the incoming element, leaving the collection unchanged.
 *
 * Which existing element is dropped under `"evict"` is defined by the ADT
 * (`Queue` drops the front, `Stack` the bottom, `Deque` the end opposite the
 * insertion, `Heap`/`PriorityQueue` the root), never by the caller — a
 * positional enum (front/back, oldest/newest) would be ambiguous for a `Deque`
 * (inserts at both ends) and meaningless for a heap (no ends at all).
 */
export type OverflowPolicy = "evict" | "skip";

/** A bounded collection that never throws on an over-capacity insert. */
export interface ILossy extends IBounded {
	/** Policy applied when the collection reaches its capacity. */
	readonly overflowPolicy: OverflowPolicy;
}
