import { Condition } from "./condition.js";
import { LockNotAcquiredError } from "./ilock.js";
import { Mutex } from "./mutex.js";

/**
 * An asynchronous read-write lock (RwLock) for coordinating access to shared resources.
 *
 * Allows multiple concurrent readers or exclusive access for a single writer.
 *
 * All lock/unlock operations are asynchronous and must be awaited.
 *
 * WARNING: Deadlock is possible if:
 *   - A task attempts to acquire a lock it already holds (no reentrancy).
 *   - Locks are acquired in inconsistent order across tasks.
 *   - A task forgets to unlock after acquiring.
 *
 * Best practices:
 *   - Always use try/finally to ensure unlock.
 *   - Avoid holding locks across await points that may block indefinitely.
 *   - Never call lock methods from within unlock callbacks.
 *
 * Example usage:
 *   await rwLock.readLock();
 *   try {
 *     // read shared resource
 *   } finally {
 *     rwLock.readUnlock();
 *   }
 */
export class RwLock {
	private mutex = new Mutex();
	private cond = new Condition();
	private readers = 0;
	private writer = false;
	private writersWaiting = 0;

	/**
	 * Acquire a read lock. Multiple readers may hold the lock concurrently unless a writer is waiting or active.
	 *
	 * @param signal Optional AbortSignal to cancel the wait.
	 * @throws Error if the lock cannot be acquired due to cancellation.
	 */
	async readLock(signal?: AbortSignal | null): Promise<void> {
		await this.mutex.lock(signal);
		try {
			while (this.writer || this.writersWaiting > 0) {
				await this.cond.wait(this.mutex, signal);
			}
			this.readers++;
		} finally {
			this.mutex.unlock();
		}
	}

	/**
	 * Acquire a write lock. Only one writer may hold the lock, and no readers may be active.
	 *
	 * @param signal Optional AbortSignal to cancel the wait.
	 * @throws Error if the lock cannot be acquired due to cancellation.
	 */
	async writeLock(signal?: AbortSignal | null): Promise<void> {
		await this.mutex.lock(signal);
		this.writersWaiting++;
		try {
			while (this.writer || this.readers > 0) {
				await this.cond.wait(this.mutex, signal);
			}
			this.writer = true;
		} finally {
			this.writersWaiting--;
			this.mutex.unlock();
		}
	}

	/**
	 * Attempt to acquire a read lock without waiting. Returns true if successful.
	 *
	 * @returns True if the read lock was acquired, false otherwise.
	 */
	tryReadLock(): boolean {
		if (!this.mutex.tryLock()) {
			return false;
		}
		try {
			if (this.writer || this.writersWaiting > 0) {
				return false;
			}
			this.readers++;
			return true;
		} finally {
			this.mutex.unlock();
		}
	}

	/**
	 * Attempt to acquire a write lock without waiting. Returns true if successful.
	 *
	 * @returns True if the write lock was acquired, false otherwise.
	 */
	tryWriteLock(): boolean {
		if (!this.mutex.tryLock()) {
			return false;
		}
		try {
			if (this.writer || this.readers > 0) {
				return false;
			}
			this.writer = true;
			return true;
		} finally {
			this.mutex.unlock();
		}
	}

	/**
	 * Upgrade a held read lock to a write lock. The caller must already hold a read lock.
	 *
	 * @param signal Optional AbortSignal to cancel the wait.
	 * @throws Error if the upgrade cannot be completed due to cancellation.
	 */
	async readToWriteLock(signal?: AbortSignal | null): Promise<void> {
		await this.mutex.lock(signal);
		this.writersWaiting++;

		try {
			if (this.readers <= 0) {
				throw new LockNotAcquiredError("Reader lock not acquired");
			}

			this.readers--;

			if (this.readers === 0) {
				await this.cond.signal();
			}

			try {
				while (this.writer || this.readers > 0) {
					await this.cond.wait(this.mutex, signal);
				}
			} catch (error) {
				// Restore reader count if wait fails (e.g., abort)
				this.readers++;
				throw error;
			}
			this.writer = true;
		} finally {
			this.writersWaiting--;
			this.mutex.unlock();
		}
	}

	/**
	 * Downgrade a held write lock to a read lock. The caller must already hold the write lock.
	 *
	 * @param signal Optional AbortSignal to cancel the wait.
	 */
	async writeToReadLock(): Promise<void> {
		await this.mutex.lock();
		try {
			if (!this.writer) {
				throw new LockNotAcquiredError("Writer lock not acquired");
			}

			this.writer = false;
			this.readers++;
			await this.cond.broadcast();
		} finally {
			this.mutex.unlock();
		}
	}

	/**
	 * Release a previously acquired read lock.
	 *
	 * WARNING: Failing to call readUnlock() after readLock() will cause deadlock.
	 */
	async readUnlock(): Promise<void> {
		await this.mutex.lock();

		try {
			if (this.readers <= 0) {
				throw new LockNotAcquiredError("Reader lock not acquired");
			}
			this.readers--;
			if (this.readers === 0) {
				await this.cond.signal();
			}
		} finally {
			this.mutex.unlock();
		}
	}

	/**
	 * Release a previously acquired write lock.
	 *
	 * WARNING: Failing to call writeUnlock() after writeLock() will cause deadlock.
	 */
	async writeUnlock(): Promise<void> {
		await this.mutex.lock();

		try {
			if (!this.writer) {
				throw new LockNotAcquiredError("Writer lock not acquired");
			}
			this.writer = false;
			await this.cond.broadcast();
		} finally {
			this.mutex.unlock();
		}
	}
}
