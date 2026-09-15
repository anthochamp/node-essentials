import { DefinedValue } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";

/**
 * The async-backed sibling of {@link IQueue}. No `IAsyncBlockingQueue`: the
 * sync `IQueue`/`IWaitableQueue` split exists only because a synchronous
 * function cannot suspend (`enqueue` throws, `waitEnqueue` awaits instead) —
 * but every async-backed method already returns a `Promise`, so "reject fast"
 * and "wait" collapse to the exact same `Promise<void>` shape. A separate
 * `IAsyncBlockingQueue` would be a redundant type identical to this one.
 */
export interface IAsyncQueue<
	T extends DefinedValue = DefinedValue,
> extends IAsyncCollection<T> {
	enqueue(item: T, signal?: AbortSignal): Promise<void>;

	enqueueAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;

	dequeue(signal?: AbortSignal): Promise<T | undefined>;

	front(signal?: AbortSignal): Promise<T | undefined>;
}
