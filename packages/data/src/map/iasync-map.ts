import { DefinedValue } from "@ac-kit/core";

import { IAsyncCollection } from "../collection/iasync-collection.js";

/** The async-backed sibling of {@link IMap}. */
export interface IAsyncMap<K, V extends DefinedValue> extends IAsyncCollection<
	readonly [K, V]
> {
	get(key: K, signal?: AbortSignal): Promise<V | undefined>;
	set(key: K, value: V, signal?: AbortSignal): Promise<void>;
	has(key: K, signal?: AbortSignal): Promise<boolean>;
	delete(key: K, signal?: AbortSignal): Promise<boolean>;
	keys(signal?: AbortSignal): AsyncIterableIterator<K>;
	values(signal?: AbortSignal): AsyncIterableIterator<V>;
	entries(signal?: AbortSignal): AsyncIterableIterator<readonly [K, V]>;
}
