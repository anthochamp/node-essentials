import { DefinedValue } from "@ac-kit/core";

/** The async-backed sibling of {@link IDisjointSet}. */
export interface IAsyncDisjointSet<T extends DefinedValue = DefinedValue> {
	setCount(signal?: AbortSignal): Promise<number>;
	makeSet(item: T, signal?: AbortSignal): Promise<void>;
	makeSets(items: Iterable<T>, signal?: AbortSignal): Promise<void>;
	find(item: T, signal?: AbortSignal): Promise<T | undefined>;
	union(a: T, b: T, signal?: AbortSignal): Promise<boolean>;
	connected(a: T, b: T, signal?: AbortSignal): Promise<boolean>;
}
