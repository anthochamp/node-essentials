import { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";

/**
 * The async-backed sibling of {@link IHeap}. No `IAsyncBlockingHeap`: every
 * async-backed method already returns a `Promise`, so the sync world's "throw
 * vs. await" split collapses to one `Promise<void>` shape — a separate blocking
 * sibling would be a redundant, identical type. `precedes` stays synchronous: a
 * pure ordering function over values the caller already holds, not I/O.
 */
export interface IAsyncHeap<
	T extends DefinedValue = DefinedValue,
> extends IAsyncCollection<T> {
	readonly precedes: OrderPredicate<T>;

	insert(item: T, signal?: AbortSignal): Promise<void>;

	insertAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;

	extract(signal?: AbortSignal): Promise<T | undefined>;

	peek(signal?: AbortSignal): Promise<T | undefined>;

	extractAndInsert(item: T, signal?: AbortSignal): Promise<T | undefined>;

	insertAndExtract(item: T, signal?: AbortSignal): Promise<T | undefined>;
}
