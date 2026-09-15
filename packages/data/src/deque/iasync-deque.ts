import { DefinedValue } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";

/**
 * The async-backed sibling of {@link IDeque}. No `IAsyncBlockingDeque`: every
 * async-backed method already returns a `Promise`, so the sync world's "throw
 * vs. await" split collapses to one `Promise<void>` shape — a separate blocking
 * sibling would be a redundant, identical type.
 */
export interface IAsyncDeque<
	T extends DefinedValue = DefinedValue,
> extends IAsyncCollection<T> {
	unshift(item: T, signal?: AbortSignal): Promise<void>;

	unshiftAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;

	push(item: T, signal?: AbortSignal): Promise<void>;

	pushAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;

	shift(signal?: AbortSignal): Promise<T | undefined>;

	pop(signal?: AbortSignal): Promise<T | undefined>;

	front(signal?: AbortSignal): Promise<T | undefined>;

	back(signal?: AbortSignal): Promise<T | undefined>;
}
