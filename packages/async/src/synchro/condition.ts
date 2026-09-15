import { WaiterQueue } from "@ac-kit/core";

import type { ILock } from "./ilock.js";

/**
 * A condition variable primitive.
 *
 * Allows tasks to wait until they are signaled to continue.
 *
 * @example
 * 	const mutex = new Mutex();
 * 	const condition = new Condition();
 * 	let ready = false;
 *
 * 	// Task 1
 * 	async function task1() {
 * 		await mutex.lock();
 * 		while (!ready) {
 * 			await condition.wait(mutex);
 * 		}
 * 		// Proceed with task
 * 		mutex.unlock();
 * 	}
 *
 * 	// Task 2
 * 	async function task2() {
 * 		ready = true;
 * 		condition.signal(); // or condition.broadcast() to wake all waiting tasks
 * 	}
 */
export class Condition {
	private readonly waiters = new WaiterQueue<void>();

	/** Signal one waiting task, if any. */
	signal(): void {
		this.waiters.releaseNext(undefined);
	}

	/** Broadcast to all waiting tasks, if any. */
	broadcast(): void {
		this.waiters.releaseAll(undefined);
	}

	/**
	 * Wait until the condition is signaled.
	 *
	 * @param lock The lockable (mutex) to use for synchronization.
	 * @param signal An optional AbortSignal to cancel the wait operation.
	 * @returns A promise that resolves when the condition is signaled.
	 */
	async wait(lock: ILock, signal?: AbortSignal | null): Promise<void> {
		// Register before releasing the lock to prevent missed signals.
		const promise = this.waiters.enqueue(undefined, signal);

		await lock.unlock();

		try {
			await promise;
		} finally {
			await lock.lock();
		}
	}
}
