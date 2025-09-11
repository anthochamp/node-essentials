import type { Promisable } from "type-fest";

/**
 * Interface representing an object that can be waited on.
 *
 * @template T - Tuple type representing the arguments that can be passed to the wait method.
 * @template R - Type of the result returned by the wait method.
 */
export interface IWaitable<T extends unknown[] = never[], R = void> {
	/**
	 * Waits for an event to occur, optionally aborting the wait if the provided
	 * AbortSignal is triggered.
	 *
	 * @param args Arguments to pass to the wait operation. The last argument can be
	 * an optional AbortSignal to cancel the wait operation.
	 * @returns A promise that resolves when the event occurs, or rejects if the
	 * operation is aborted.
	 */
	wait(...args: [...T, signal?: AbortSignal | null]): Promisable<R>;
}
