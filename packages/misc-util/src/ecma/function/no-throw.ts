import type { Promisable } from "type-fest";
import type { AsyncCallable, Callable, MaybeAsyncCallable } from "./types.js";

/**
 * Wraps a function to catch and re-throw any errors it throws out of the
 * current execution flow.
 *
 * This prevents unhandled exceptions from disrupting the current execution flow.
 *
 * Note: This function does not handle promise rejections. For async functions,
 * use `noThrowAsync` instead.
 *
 * @param func The function to wrap.
 * @returns A new function that wraps the original function and catches any errors thrown.
 */
export function noThrow<A extends unknown[], R, T>(
	func: Callable<A, R, T>,
): Callable<A, R | undefined, T> {
	return function (this, ...args) {
		try {
			// only catch sync errors
			return func.apply(this, args);
		} catch (error) {
			queueMicrotask(() => {
				throw error;
			});
		}
	};
}

/**
 * Wraps a function to catch and re-throw any errors it throws or promise
 * rejections out of the current execution flow.
 *
 * This prevents uncaught exceptions / unhandled rejections from disrupting the
 * current execution flow.
 *
 * @param func The function to wrap.
 * @returns A new async function that wraps the original function and catches any errors thrown or promise rejections.
 */
export function noThrowAsync<A extends unknown[], R, T>(
	func: MaybeAsyncCallable<A, R, T>,
): AsyncCallable<A, R | undefined, T> {
	return async function (this, ...args) {
		let result: Promisable<R> | undefined;
		try {
			// catch sync errors
			result = func.apply(this, args);
		} catch (error) {
			queueMicrotask(() => {
				throw error;
			});

			return;
		}

		try {
			// catch async errors
			return await result;
		} catch (error) {
			queueMicrotask(() => {
				// biome-ignore lint/nursery/noFloatingPromises: intentional
				Promise.reject(error);
			});
		}
	};
}
