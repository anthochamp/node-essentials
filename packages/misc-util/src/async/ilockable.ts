import type { Promisable } from "type-fest";
import type {
	Callable,
	MaybeAsyncCallableNoArgs,
} from "../ecma/function/types.js";

/**
 * Interface representing a lockable resource.
 *
 * A lockable resource can be acquired and released to ensure exclusive access.
 */
export interface ILockable {
	/**
	 * Indicates whether the lock is currently held.
	 */
	readonly locked: boolean;

	/**
	 * Acquires the lock, waiting if necessary until it is available.
	 *
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns A promise that resolves to a function that releases the lock.
	 */
	acquire(signal?: AbortSignal | null): Promisable<Callable>;

	/**
	 * Releases the lock.
	 */
	release(): Promisable<void>;

	/**
	 * Acquires the lock, executes the callback, and releases the lock.
	 *
	 * @param func The callback to execute while holding the lock.
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns The result of the callback.
	 */
	withLock<R>(
		func: MaybeAsyncCallableNoArgs<R>,
		signal?: AbortSignal | null,
	): Promisable<R>;
}
