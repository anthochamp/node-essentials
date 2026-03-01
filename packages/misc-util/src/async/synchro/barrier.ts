import { Counter } from "./counter.js";

/**
 * An asynchronous reusable barrier for N participants.
 *
 * Barriers allow multiple asynchronous tasks to wait until a specified number
 * of them have reached a certain point in their execution.
 *
 * After the required number of tasks have called `wait()`, all waiting tasks
 * are released, and the barrier resets for reuse.
 *
 * @example
 * const barrier = new Barrier(3);
 *
 * async function task(id: number) {
 *     console.log(`Task ${id} is waiting at the barrier.`);
 *     await barrier.wait();
 *     console.log(`Task ${id} has crossed the barrier.`);
 * }
 *
 * // Start 3 tasks that will wait at the barrier
 * task(1);
 * task(2);
 * task(3);
 */
export class Barrier {
	private readonly counter = new Counter(0);

	/**
	 * Create a Barrier for the specified number of participants.
	 *
	 * @param count Number of participants required to release the barrier.
	 */
	constructor(private readonly count: number) {
		if (count <= 0) {
			throw new Error("Barrier count must be positive");
		}
	}

	/**
	 * Wait for the barrier.
	 *
	 * After releasing all waiters, the barrier resets for reuse.
	 *
	 * @param signal An optional AbortSignal to cancel the wait operation.
	 * @returns A promise that resolves when the barrier is released.
	 */
	async wait(signal?: AbortSignal | null): Promise<void> {
		if (this.counter.increment() === this.count) {
			this.counter.reset();
			return;
		}

		await this.counter.wait(this.count, signal);
	}
}
