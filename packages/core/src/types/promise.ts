import type { CallableNoArgs } from "./callable.js";

export type PromiseResolve<T> = PromiseWithResolvers<T>["resolve"];
export type PromiseReject = PromiseWithResolvers<unknown>["reject"];

export type PromiseExecutor<T> = (
	resolve: PromiseResolve<T>,
	reject: PromiseReject,
) => void;

export type PromiseOnFulfilled<T, TResult> = (
	value: T,
) => MaybePromiseLike<TResult>;
export type PromiseOnRejected<TResult> = (
	reason: unknown,
) => MaybePromiseLike<TResult>;
export type PromiseOnFinally = CallableNoArgs;

export type PromiseThen<T, TResult1 = T, TResult2 = never> = (
	onfulfilled?: PromiseOnFulfilled<T, TResult1> | null,
	onrejected?: PromiseOnRejected<TResult2> | null,
) => Promise<TResult1 | TResult2>;

export type PromiseCatch<T, TResult = never> = (
	onrejected?: PromiseOnRejected<TResult> | null,
) => Promise<T | TResult>;

export type PromiseFinally<T> = (
	onfinally?: PromiseOnFinally | null,
) => Promise<T>;

export type MaybePromise<T> = T | Promise<T>;
export type MaybePromiseLike<T> = T | PromiseLike<T>;
