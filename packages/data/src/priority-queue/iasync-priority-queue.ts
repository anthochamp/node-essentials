import { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";
import { PriorityEntry } from "./ipriority-queue.js";

/**
 * The async-backed sibling of {@link IPriorityQueue}. No
 * `IAsyncBlockingPriorityQueue`: every async-backed method already returns a
 * `Promise`, so the sync world's "throw vs. await" split collapses to one
 * `Promise<void>` shape — a separate blocking sibling would be a redundant,
 * identical type. `precedes` stays synchronous: a pure ordering function over
 * values the caller already holds, not I/O.
 */
export interface IAsyncPriorityQueue<
	T extends DefinedValue = DefinedValue,
	P = number,
> extends IAsyncCollection<T> {
	readonly precedes: OrderPredicate<P>;

	insert(priority: P, item: T, signal?: AbortSignal): Promise<void>;

	insertAll(
		priority: P,
		items: Iterable<T>,
		signal?: AbortSignal,
	): Promise<void>;

	extract(signal?: AbortSignal): Promise<T | undefined>;

	peek(signal?: AbortSignal): Promise<T | undefined>;

	setPriority(item: T, priority: P, signal?: AbortSignal): Promise<boolean>;

	entries(signal?: AbortSignal): AsyncIterableIterator<PriorityEntry<T, P>>;
}
