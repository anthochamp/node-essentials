import { type ILock, LockNotAcquiredError } from "./ilock.js";
import { Semaphore } from "./semaphore.js";

/**
 * A mutex (mutual exclusion) primitive for asynchronous tasks.
 *
 * A mutex allows only one task to hold the lock at a time. Other tasks
 * attempting to acquire the lock will wait until it is released.
 *
 * The order of lock acquisition is guaranteed to be FIFO (first-in-first-out).
 *
 * Note: Only meaningful when the critical section contains at least one `await`
 * — synchronous operations cannot be interleaved in JS's single-threaded
 * model.
 */
export class Mutex implements ILock {
	private readonly semaphore = new Semaphore(1, 1);

	get locked(): boolean {
		return this.semaphore.value === 0;
	}

	tryLock(): boolean {
		return this.semaphore.tryAcquire();
	}

	lock(signal?: AbortSignal | null): Promise<void> {
		return this.semaphore.acquire(1, signal);
	}

	unlock(): void {
		if (!this.locked) {
			throw new LockNotAcquiredError();
		}

		this.semaphore.release();
	}
}
