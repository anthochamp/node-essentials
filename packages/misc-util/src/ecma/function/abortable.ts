import { noThrow } from "./no-throw.js";
import type { AsyncCallable, Callable, MaybeAsyncCallable } from "./types.js";

export type AbortableProps = {
	/**
	 * The callback to call when the operation is aborted.
	 */
	onAbort: (error?: unknown) => void;

	/**
	 * The abort signal to listen to.
	 */
	signal?: AbortSignal | null;
};

/**
 * Wraps a function to make it abortable. The wrapped function will listen to the
 * provided abort signal and call the onAbort callback if the signal is aborted.
 *
 * If the signal is already aborted, the onAbort callback will be called
 * BEFORE calling the original function.
 *
 * Note: This function should not be used to wrap functions that return promises.
 * Use `abortableAsync` instead.
 *
 * @param func The function to wrap.
 * @param options The abortable options.
 * @returns A new function that is abortable.
 */
export function abortable<A extends unknown[], R, T>(
	func: Callable<A, R, T>,
	{ onAbort, signal }: AbortableProps,
): Callable<A, R, T> {
	const noThrowOnAbort = noThrow(onAbort);

	const handleAbort = () => {
		let abortError: unknown;
		try {
			signal?.throwIfAborted?.();
		} catch (error) {
			abortError = error;
		}
		noThrowOnAbort(abortError);
	};

	return function (this, ...args) {
		try {
			if (signal?.aborted) {
				handleAbort();
			} else {
				signal?.addEventListener("abort", handleAbort, { once: true });
			}

			return func.apply(this, args);
		} finally {
			signal?.removeEventListener("abort", handleAbort);
		}
	};
}

/**
 * Wraps a function to make it abortable. The wrapped function will listen to the
 * provided abort signal and call the onAbort callback if the signal is aborted.
 *
 * If the signal is already aborted, the onAbort callback will be called
 * BEFORE calling the original function.
 *
 * @param func The function to wrap.
 * @param options The abortable options.
 * @returns A new function that is abortable.
 */
export function abortableAsync<A extends unknown[], R, T>(
	func: MaybeAsyncCallable<A, R, T>,
	{ onAbort, signal }: AbortableProps,
): AsyncCallable<A, R, T> {
	const noThrowOnAbort = noThrow(onAbort);

	const handleAbort = () => {
		let abortError: unknown;
		try {
			signal?.throwIfAborted?.();
		} catch (error) {
			abortError = error;
		}
		noThrowOnAbort(abortError);
	};

	return async function (this, ...args) {
		try {
			if (signal?.aborted) {
				handleAbort();
			} else {
				signal?.addEventListener("abort", handleAbort, { once: true });
			}

			return await func.apply(this, args);
		} finally {
			signal?.removeEventListener("abort", handleAbort);
		}
	};
}
