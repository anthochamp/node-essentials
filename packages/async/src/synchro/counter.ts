import { WaiterQueue } from "@ac-kit/core";

/**
 * A counter primitive that can be incremented, decremented, and waited upon.
 *
 * @example
 * 	const counter = new Counter(0);
 *
 * 	// Increment the counter
 * 	counter.increment();
 * 	// Decrement the counter
 * 	counter.decrement();
 *
 * 	// Wait for the counter to reach a specific value
 * 	await counter.wait(5);
 */
export class Counter {
	private value_: number;
	// Metadata is the exact value a waiter is blocked on. Release isn't a FIFO
	// prefix here — an earlier-queued wait for 5 can resolve after a later one
	// for 3, so every waiter is checked on each change, not just the front.
	private readonly waiters = new WaiterQueue<void, number>();

	/**
	 * Creates a new Counter instance.
	 *
	 * @param initialValue The initial value of the counter. Default is `0`.
	 */
	constructor(initialValue = 0) {
		this.value_ = initialValue;
	}

	get value(): number {
		return this.value_;
	}

	/** Resets the counter to zero. */
	reset(): void {
		this.value_ = 0;
		this.handleWaiters(this.value_);
	}

	/**
	 * Increments the counter by one.
	 *
	 * @returns The new value of the counter after incrementing.
	 */
	increment(): number {
		this.handleWaiters(++this.value_);
		return this.value_;
	}

	/**
	 * Decrements the counter by one.
	 *
	 * @returns The new value of the counter after decrementing.
	 */
	decrement(): number {
		this.handleWaiters(--this.value_);
		return this.value_;
	}

	/**
	 * Waits until the counter reaches the specified target value.
	 *
	 * @param targetValue The value to wait for.
	 * @param signal An optional AbortSignal to cancel the wait.
	 */
	wait(targetValue: number, signal?: AbortSignal | null): Promise<void> {
		if (signal?.aborted) return Promise.reject(signal.reason);
		if (this.value_ === targetValue) return Promise.resolve();

		return this.waiters.enqueue(targetValue, signal);
	}

	private handleWaiters(value: number): void {
		this.waiters.releaseMatching(
			(targetValue) => targetValue === value,
			undefined,
		);
	}
}
