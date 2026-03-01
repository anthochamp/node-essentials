import type { Promisable } from "type-fest";

/**
 * Error thrown when attempting to release a lock that is not currently held.
 */
export class LockNotAcquiredError extends Error {
	constructor(message?: string) {
		super(message ?? "Lock is not acquired");
		this.name = "LockNotAcquiredError";
	}
}

/**
 * Interface representing a lockable resource.
 *
 * A lockable resource can be acquired and released to control access.
 */
export interface ILock {
	/**
	 * Indicates whether the lock is currently held.
	 */
	readonly locked: boolean;

	/**
	 * Attempts to acquire the lock without waiting.
	 *
	 * @returns True if the lock was successfully acquired, false otherwise.
	 */
	tryLock(): Promisable<boolean>;

	/**
	 * Acquires the lock, waiting if necessary until it is available.
	 *
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns A promise that resolves when the lock is acquired.
	 */
	lock(signal?: AbortSignal | null): Promisable<void>;

	/**
	 * Releases the lock.
	 */
	unlock(): Promisable<void>;
}
