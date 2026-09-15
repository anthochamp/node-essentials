import { MaybeAsyncCallable, MaybeAsyncPredicate } from "@ac-kit/core";

/** The async-backed sibling of {@link ISearchable}. */
export interface IAsyncSearchable<T> {
	removeFirst(
		condition: MaybeAsyncPredicate<[T]>,
		signal?: AbortSignal,
	): Promise<boolean>;

	remove(
		condition: MaybeAsyncPredicate<[T]>,
		signal?: AbortSignal,
	): AsyncIterableIterator<T>;

	replaceFirst(
		condition: MaybeAsyncPredicate<[T]>,
		newItem: T,
		signal?: AbortSignal,
	): Promise<boolean>;

	replace(
		condition: MaybeAsyncPredicate<[T]>,
		newItemFactory: MaybeAsyncCallable<[T], T>,
		signal?: AbortSignal,
	): AsyncIterableIterator<T>;
}
