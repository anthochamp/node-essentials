import { removeSafe } from "../../ecma/array/remove-safe.js";
import type { PromiseResolve } from "../../ecma/promise/types.js";
import { type ILock, LockNotAcquiredError } from "./ilock.js";

/**
 * A mutex (mutual exclusion) primitive for asynchronous tasks.
 *
 * A mutex allows only one task to hold the lock at a time.
 * Other tasks attempting to acquire the lock will wait until it is released.
 *
 * The order of lock acquisition is guaranteed to be FIFO (first-in-first-out).
 */
export class Mutex implements ILock {
	private locked_: boolean = false;
	// we do not use a Queue data structure here because it requires the Mutex (via the Semaphore)
	private readonly waiters: PromiseResolve<void>[] = [];

	get locked(): boolean {
		return this.locked_;
	}

	tryLock(): boolean {
		if (this.locked_) {
			return false;
		}

		this.locked_ = true;
		return true;
	}

	async lock(signal?: AbortSignal | null): Promise<void> {
		const deferred = Promise.withResolvers<void>();

		this.waiters.push(deferred.resolve);

		const handleAbort = () => {
			deferred.reject(signal?.reason);
		};
		try {
			signal?.throwIfAborted();
			signal?.addEventListener("abort", handleAbort, {
				once: true,
			});

			if (!this.locked_) {
				this.locked_ = true;
				deferred.resolve();
			}

			await deferred.promise;
		} finally {
			signal?.removeEventListener("abort", handleAbort);
			removeSafe(this.waiters, deferred.resolve);
		}
	}

	unlock(): void {
		if (!this.locked_) {
			throw new LockNotAcquiredError();
		}

		const waiter = this.waiters.shift();
		if (waiter !== undefined) {
			waiter();
			return;
		}

		this.locked_ = false;
	}
}
