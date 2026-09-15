import { Comparator } from "@ac-kit/core";

/**
 * The async-backed sibling of {@link IOrderedRange}. `comparator` stays
 * synchronous: a pure ordering function over values the caller already holds,
 * not I/O.
 */
export interface IAsyncOrderedRange<T, Q = T> {
	readonly comparator: Comparator<Q>;
	min(signal?: AbortSignal): Promise<T | undefined>;
	max(signal?: AbortSignal): Promise<T | undefined>;
	floor(query: Q, signal?: AbortSignal): Promise<T | undefined>;
	ceiling(query: Q, signal?: AbortSignal): Promise<T | undefined>;
	range(from?: Q, to?: Q, signal?: AbortSignal): AsyncIterableIterator<T>;
}
