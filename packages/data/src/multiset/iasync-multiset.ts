import { IAsyncCollection } from "../collection/iasync-collection.js";

/** The async-backed sibling of {@link IMultiset}. */
export interface IAsyncMultiset<T> extends IAsyncCollection<T> {
	add(item: T, times?: number, signal?: AbortSignal): Promise<void>;
	addAll(
		items: Iterable<T>,
		times?: number,
		signal?: AbortSignal,
	): Promise<void>;
	delete(item: T, times?: number, signal?: AbortSignal): Promise<number>;
	has(item: T, signal?: AbortSignal): Promise<boolean>;
	multiplicity(item: T, signal?: AbortSignal): Promise<number>;
	distinctCount(signal?: AbortSignal): Promise<number>;
	distinct(signal?: AbortSignal): AsyncIterableIterator<T>;
	entries(signal?: AbortSignal): AsyncIterableIterator<readonly [T, number]>;
}
