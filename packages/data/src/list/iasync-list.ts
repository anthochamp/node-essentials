import { DefinedValue } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";
import { IAsyncSearchable } from "../collection/iasync-searchable.js";

/**
 * The async-backed sibling of {@link IList}. No `IAsyncBlockingList`: every
 * async-backed method already returns a `Promise`, so the sync world's "throw
 * vs. await" split collapses to one `Promise<void>` shape — a separate blocking
 * sibling would be a redundant, identical type.
 */
export interface IAsyncList<T extends DefinedValue = DefinedValue>
	extends IAsyncCollection<T>, IAsyncSearchable<T> {
	get(index: number, signal?: AbortSignal): Promise<T | undefined>;

	set(index: number, item: T, signal?: AbortSignal): Promise<void>;

	splice(
		start: number,
		deleteCount?: number,
		item?: T,
		signal?: AbortSignal,
	): AsyncIterableIterator<T>;

	spliceAll(
		start: number,
		deleteCount?: number,
		items?: Iterable<T>,
		signal?: AbortSignal,
	): AsyncIterableIterator<T>;

	slice(
		start?: number,
		end?: number,
		signal?: AbortSignal,
	): AsyncIterableIterator<T>;
}
