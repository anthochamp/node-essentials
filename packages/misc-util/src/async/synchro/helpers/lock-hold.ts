import type { ILock } from "../ilock.js";

const LOCK_ID_SYMBOL = Symbol.for("ac-essentials.lock-id");

/**
 * A hold on one or more locks.
 *
 * This class represents a collection of locks that have been acquired. It
 * provides methods to release all held locks in a safe manner.
 *
 * Locks are acquired in a globally consistent order to prevent deadlocks.
 *
 * When a LockHold is no longer needed, the `unlock` method should be called
 * to release all held locks. Alternatively, it can be used with the `using`
 * statement for automatic disposal.
 *
 * Locks are released in the reverse order of acquisition to maintain proper
 * locking semantics.
 *
 * @example
 * ```ts
 * const lockA = new Mutex();
 * const lockB = new Mutex();
 *
 * async function criticalSection() {
 *     // Acquire both locks
 *     const lockHold = await LockHold.from([lockA, lockB]);
 *     try {
 *         // Critical section code goes here
 *     } finally {
 *         // Release the locks
 *         await lockHold.unlock();
 *     }
 * }
 * ```
 *
 * @example Using with `using` statement
 * ```ts
 * const lockA = new Mutex();
 * const lockB = new Mutex();
 *
 * async function criticalSection() {
 *     // Acquire both locks
 *     await using _ = await LockHold.from([lockA, lockB]);
 *     // Critical section code goes here
 * }
 * ```
 */
export class LockHold implements AsyncDisposable {
	private constructor(private readonly locks: Iterable<ILock>) {}

	private static async _unlock(heldLocks: ILock[]): Promise<void> {
		for (const lock of [...heldLocks].reverse()) {
			await lock.unlock();
		}
	}

	private static lockIdCounter = 0;
	private static getLockId(lockable: ILock): number {
		if (!(LOCK_ID_SYMBOL in lockable)) {
			Object.defineProperty(lockable, LOCK_ID_SYMBOL, {
				value: ++LockHold.lockIdCounter,
				writable: false,
				enumerable: false,
				configurable: false,
			});
		}

		// @ts-expect-error: Symbol property is not typed
		return lockable[LOCK_ID_SYMBOL] as number;
	}

	/**
	 * Acquires locks on all provided locks, waiting as necessary.
	 *
	 * The locks are acquired in a globally consistent order to prevent deadlocks.
	 *
	 * If any lock cannot be acquired, all previously acquired locks are released
	 * and the error is thrown.
	 *
	 * @param locks The iterable of locks to acquire.
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns A promise that resolves to a LockHold when all locks are acquired.
	 */
	static async from(
		locks: Iterable<ILock>,
		signal?: AbortSignal | null,
	): Promise<LockHold> {
		const sortedLocks = [...locks].sort(
			(a, b) => LockHold.getLockId(a) - LockHold.getLockId(b),
		);

		const heldLocks: ILock[] = [];
		try {
			for (const lock of sortedLocks) {
				await lock.lock(signal);
				heldLocks.push(lock);
			}
		} catch (error) {
			await LockHold._unlock(heldLocks);

			throw error;
		}

		return new LockHold(heldLocks);
	}

	/**
	 * Tries to acquire locks on all provided locks without waiting.
	 *
	 * The locks are acquired in a globally consistent order to prevent deadlocks.
	 *
	 * If any lock is already held, all previously acquired locks are released and
	 * the function returns `null`. Otherwise, a LockHold is returned.
	 *
	 * @param locks The locks to acquire.
	 * @returns A promise that resolves to a LockHold if all locks were acquired,
	 * or `null` if any lock could not be acquired.
	 */
	static async tryFrom(...locks: ILock[]): Promise<LockHold | null> {
		const sortedLocks = [...locks].sort(
			(a, b) => LockHold.getLockId(a) - LockHold.getLockId(b),
		);

		const heldLocks: ILock[] = [];
		try {
			for (const lock of sortedLocks) {
				const locked = await lock.tryLock();
				if (!locked) {
					await LockHold._unlock(heldLocks);
					return null;
				}

				heldLocks.push(lock);
			}
		} catch (error) {
			await LockHold._unlock(heldLocks);

			throw error;
		}

		return new LockHold(heldLocks);
	}

	/**
	 * Releases all held locks.
	 */
	async unlock(): Promise<void> {
		await LockHold._unlock(Array.from(this.locks));
	}

	[Symbol.asyncDispose](): PromiseLike<void> {
		return this.unlock();
	}
}
