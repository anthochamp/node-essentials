import { IAsyncCollection } from "../collection/iasync-collection.js";

/** The async-backed sibling of {@link ISet}. */
export interface IAsyncSet<T> extends IAsyncCollection<T> {
	add(item: T, signal?: AbortSignal): Promise<void>;
	addAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;
	delete(item: T, signal?: AbortSignal): Promise<boolean>;
	has(item: T, signal?: AbortSignal): Promise<boolean>;

	union(other: Iterable<T>, signal?: AbortSignal): Promise<IAsyncSet<T>>;
	intersection(other: Iterable<T>, signal?: AbortSignal): Promise<IAsyncSet<T>>;
	difference(other: Iterable<T>, signal?: AbortSignal): Promise<IAsyncSet<T>>;
	symmetricDifference(
		other: Iterable<T>,
		signal?: AbortSignal,
	): Promise<IAsyncSet<T>>;
	isSubsetOf(other: Iterable<T>, signal?: AbortSignal): Promise<boolean>;
	isSupersetOf(other: Iterable<T>, signal?: AbortSignal): Promise<boolean>;
	isDisjointFrom(other: Iterable<T>, signal?: AbortSignal): Promise<boolean>;
}
