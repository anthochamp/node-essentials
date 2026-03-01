import { Counter } from "./counter.js";

/**
 * An asynchronous reusable latch for N participants.
 *
 * All waiters are released together when the latch is released (countdown
 * reaches zero).
 *
 * After releasing all waiters, the latch remains released.
 *
 * @example
 * const latch = new Latch(3);
 *
 * async function task(id: number) {
 *     console.log(`Task ${id} is waiting at the latch.`);
 *     await latch.wait();
 *     console.log(`Task ${id} has crossed the latch.`);
 * }
 *
 * // Start 3 tasks that will wait at the latch
 * task(1);
 * task(2);
 * task(3);
 *
 * // Simulate some work before counting down
 * setTimeout(() => {
 *     console.log("Counting down the latch");
 *     latch.countDown();
 *     latch.countDown();
 *     latch.countDown();
 * }, 1000);
 */
export class Latch {
	private counter: Counter;

	/**
	 * Create a Latch for the specified number of participants.
	 *
	 * @param count Number of countDown calls required to release the latch.
	 */
	constructor(count: number) {
		if (count <= 0) {
			throw new Error("Latch count must be positive");
		}

		this.counter = new Counter(count);
	}

	/**
	 * Returns true if the latch has been released.
	 */
	get released(): boolean {
		return this.counter.value === 0;
	}

	/**
	 * Wait for the latch to be released. Resolves when countDown() has been
	 * called count times.
	 *
	 * @param signal An optional AbortSignal to cancel the wait operation.
	 * @returns A promise that resolves when the latch is released.
	 */
	async wait(signal?: AbortSignal | null): Promise<void> {
		await this.counter.wait(0, signal);
	}

	/**
	 * Decrement the latch. When the count reaches zero, all waiters are released.
	 */
	countDown(): void {
		if (this.counter.value === 0) {
			return;
		}

		this.counter.decrement();
	}
}
