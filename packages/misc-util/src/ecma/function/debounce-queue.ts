import type { AsyncCallable, CallableNoArgs } from "./types.js";

/**
 * Wraps an asynchronous function to ensure that only one instance of it runs
 * at a time.
 *
 * If the wrapped function is called while a previous call is still in progress,
 * the new call is queued to run immediately after the current one completes.
 *
 * This is useful for debouncing async operations that should not overlap, such as
 * network requests or file operations.
 *
 * When called, the function returns a promise that resolves or rejects with the
 * result of the next queued call.
 *
 * This is a specialized form a debounce function, with a zero wait time, and no
 * arguments.
 *
 * @param func The asynchronous function to wrap.
 * @returns The wrapped function.
 */
export function debounceQueue<T>(
	func: CallableNoArgs<Promise<T>>,
): AsyncCallable<[signal?: AbortSignal | null], T> {
	let currentDeferred: PromiseWithResolvers<T> | undefined;
	let nextDeferred: PromiseWithResolvers<T> | undefined;

	const execute = (deferred: PromiseWithResolvers<T>): void => {
		currentDeferred = deferred;

		func()
			.then(deferred.resolve, deferred.reject)
			.finally(() => {
				currentDeferred = undefined;

				// If there's a queued call, execute it next
				if (nextDeferred) {
					const next = nextDeferred;
					nextDeferred = undefined;
					execute(next);
				}
			});
	};

	return () => {
		let deferred = Promise.withResolvers<T>();

		// If there's already a call in progress, queue this one
		if (currentDeferred) {
			// If there's already a next call queued, use its deferred
			if (nextDeferred) {
				deferred = nextDeferred;
			}
			// Else, queue this call as the next one
			else {
				nextDeferred = deferred;
			}
		}
		// No call in progress, execute immediately
		else {
			execute(deferred);
		}

		return deferred.promise;
	};
}
