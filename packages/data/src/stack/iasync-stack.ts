import { DefinedValue } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";

/**
 * The async-backed sibling of {@link IStack}. No `IAsyncBlockingStack`: every
 * async-backed method already returns a `Promise`, so the sync world's "throw
 * vs. await" split collapses to one `Promise<void>` shape — a separate blocking
 * sibling would be a redundant, identical type.
 */
export interface IAsyncStack<
	T extends DefinedValue = DefinedValue,
> extends IAsyncCollection<T> {
	push(item: T, signal?: AbortSignal): Promise<void>;

	pushAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;

	pop(signal?: AbortSignal): Promise<T | undefined>;

	top(signal?: AbortSignal): Promise<T | undefined>;
}
