import type { Promisable } from "type-fest";
import type { CallableNoArgs } from "../function/types.js";

export type PromiseResolve<T> = PromiseWithResolvers<T>["resolve"];
export type PromiseReject = PromiseWithResolvers<unknown>["reject"];

export type PromiseExecutor<T> = (
	resolve: PromiseResolve<T>,
	reject: PromiseReject,
) => void;

export type PromiseOnFulfilled<T, TResult> = (value: T) => Promisable<TResult>;
export type PromiseOnRejected<TResult> = (
	reason: unknown,
) => Promisable<TResult>;
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
