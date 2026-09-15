import { IAsyncCollection } from "../collection/iasync-collection.js";

/** The async-backed sibling of {@link IMultimap}. */
export interface IAsyncMultimap<K, V> extends IAsyncCollection<
	readonly [K, V]
> {
	get(key: K, signal?: AbortSignal): AsyncIterableIterator<V>;
	add(key: K, value: V, signal?: AbortSignal): Promise<void>;
	addAll(key: K, values: Iterable<V>, signal?: AbortSignal): Promise<void>;
	has(key: K, signal?: AbortSignal): Promise<boolean>;
	hasEntry(key: K, value: V, signal?: AbortSignal): Promise<boolean>;
	delete(key: K, signal?: AbortSignal): Promise<number>;
	deleteEntry(key: K, value: V, signal?: AbortSignal): Promise<boolean>;
	countFor(key: K, signal?: AbortSignal): Promise<number>;
	keyCount(signal?: AbortSignal): Promise<number>;
	keys(signal?: AbortSignal): AsyncIterableIterator<K>;
	entries(signal?: AbortSignal): AsyncIterableIterator<readonly [K, V]>;
}
