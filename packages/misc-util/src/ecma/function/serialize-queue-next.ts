import type { AsyncCallable, MaybeAsyncCallableNoArgs } from "./types.js";

/**
 * Wraps an asynchronous function to ensure that only one instance runs
 * at a time, and if called again while running, only one additional call
 * is queued to run immediately after the current one completes.
 *
 * This pattern serializes async operations and queues at most one next call.
 * If multiple calls are made while an operation is in progress, they all
 * share the same promise for the next execution.
 *
 * Useful for preventing overlapping async operations (such as network or file
 * requests) while ensuring that the latest requested operation is not lost.
 *
 * This is a specialized form of serialization with a single-call queue,
 * zero wait time, and no arguments.
 *
 * @param func The asynchronous function to wrap.
 * @returns The wrapped function.
 */
export function serializeQueueNext<T>(
	func: MaybeAsyncCallableNoArgs<T>,
): AsyncCallable<[signal?: AbortSignal | null], T> {
	let currentDeferred: PromiseWithResolvers<T> | undefined;
	let nextDeferred: PromiseWithResolvers<T> | undefined;

	const execute = (deferred: PromiseWithResolvers<T>): void => {
		currentDeferred = deferred;

		Promise.try(func)
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
