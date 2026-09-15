import type { IBounded } from "./ibounded.js";

/**
 * Replacement policies for associative collections that exceed their capacity.
 *
 * - Least recently used (LRU),
 * - Least frequently used (LFU),
 * - First in first out (FIFO),
 * - Skip (no replacement).
 */
export type ReplacementPolicy = "lru" | "lfu" | "fifo" | "skip";

/**
 * A bounded associative collection that replaces an entry instead of rejecting
 * an over-capacity insert.
 *
 * Positional ADTs have a natural eviction victim (see {@link ILossy}) contrary
 * to associative ones.
 */
export interface IReplacing extends IBounded {
	/**
	 * The policy that determines which entry to replace when the collection
	 * exceeds its capacity.
	 */
	readonly overflowPolicy: ReplacementPolicy;
}
