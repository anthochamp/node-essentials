import type { Promisable } from "type-fest";

export type Callable<A extends unknown[] = never[], R = void, T = unknown> = (
	this: T,
	...args: A
) => R;

export type CallableNoArgs<R = void, T = unknown> = Callable<[], R, T>;

export type MaybeAsyncCallable<
	A extends unknown[] = never[],
	R = void,
	T = unknown,
> = Callable<A, Promisable<R>, T>;

export type MaybeAsyncCallableNoArgs<R = void, T = unknown> = CallableNoArgs<
	Promisable<R>,
	T
>;

export type AsyncCallable<
	A extends unknown[] = never[],
	R = void,
	T = unknown,
> = Callable<A, PromiseLike<R>, T>;

export type AsyncCallableNoArgs<R = void, T = unknown> = CallableNoArgs<
	PromiseLike<R>,
	T
>;

export type Callback<A extends unknown[] = never[], T = unknown> = Callable<
	A,
	void,
	T
>;

export type MaybeAsyncCallback<
	A extends unknown[] = never[],
	T = unknown,
> = MaybeAsyncCallable<A, void, T>;

export type AsyncCallback<
	A extends unknown[] = never[],
	T = unknown,
> = AsyncCallable<A, void, T>;

export type Predicate<A extends unknown[] = never[], T = unknown> = Callable<
	A,
	boolean,
	T
>;

export type MaybeAsyncPredicate<
	A extends unknown[] = never[],
	T = unknown,
> = MaybeAsyncCallable<A, boolean, T>;

export type AsyncPredicate<
	A extends unknown[] = never[],
	T = unknown,
> = AsyncCallable<A, boolean, T>;
