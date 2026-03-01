import { Queue } from "../../data/queue.js";
import type { Callable } from "../../ecma/function/types.js";
import type { ILock } from "./ilock.js";
import { Mutex } from "./mutex.js";

/**
 * A condition variable primitive.
 *
 * Allows tasks to wait until they are signaled to continue.
 *
 * @example
 * const mutex = new Mutex();
 * const condition = new Condition();
 * let ready = false;
 *
 * // Task 1
 * async function task1() {
 *     await mutex.lock();
 *     while (!ready) {
 *         await condition.wait(mutex);
 *     }
 *     // Proceed with task
 *     mutex.unlock();
 * }
 *
 * // Task 2
 * async function task2() {
 *     await mutex.lock();
 *     ready = true;
 *     condition.signal(); // or condition.broadcast() to wake all waiting tasks
 *     mutex.unlock();
 * }
 */
export class Condition {
	private readonly waiters = new Queue<Callable>();
	private readonly waitersLock = new Mutex();

	/**
	 * Signal one waiting task, if any.
	 */
	async signal(): Promise<void> {
		let waiter: Callable | undefined;

		await this.waitersLock.lock();
		try {
			waiter = this.waiters.dequeue();
		} finally {
			this.waitersLock.unlock();
		}

		waiter?.();
	}

	/**
	 * Broadcast to all waiting tasks, if any.
	 */
	async broadcast(): Promise<void> {
		let waiters: Callable[];

		await this.waitersLock.lock();
		try {
			// Copy the waiters to avoid holding the lock while invoking them
			waiters = Array.from(this.waiters.concat());
			this.waiters.clear();
		} finally {
			this.waitersLock.unlock();
		}

		for (const waiter of waiters) {
			waiter();
		}
	}

	/**
	 * Wait until the condition is signaled.
	 *
	 * @param lock The lockable (mutex) to use for synchronization.
	 * @param signal An optional AbortSignal to cancel the wait operation.
	 * @returns A promise that resolves when the condition is signaled.
	 */
	async wait(lock: ILock, signal?: AbortSignal | null): Promise<void> {
		await lock.unlock();

		try {
			const deferred = Promise.withResolvers<void>();

			await this.waitersLock.lock();
			try {
				this.waiters.enqueue(deferred.resolve);
			} finally {
				this.waitersLock.unlock();
			}

			const handleAbort = () => {
				deferred.reject(signal?.reason);
			};

			try {
				signal?.throwIfAborted();
				signal?.addEventListener("abort", handleAbort, {
					once: true,
				});

				await deferred.promise;
			} finally {
				signal?.removeEventListener("abort", handleAbort);

				await this.waitersLock.lock();
				try {
					this.waiters.removeFirst((item) => item === deferred.resolve);
				} finally {
					this.waitersLock.unlock();
				}
			}
		} finally {
			await lock.lock();
		}
	}
}
