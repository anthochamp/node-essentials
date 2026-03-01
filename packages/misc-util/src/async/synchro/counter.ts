import { removeSafe } from "../../ecma/array/remove-safe.js";
import type { PromiseResolve } from "../../ecma/promise/types.js";

type Waiter_ = {
	resolve: PromiseResolve<void>;
	targetValue: number;
};

/**
 * A counter primitive that can be incremented, decremented, and waited upon.
 *
 * @example
 * const counter = new Counter(0);
 *
 * // Increment the counter
 * counter.increment();
 * // Decrement the counter
 * counter.decrement();
 *
 * // Wait for the counter to reach a specific value
 * await counter.wait(5);
 */
export class Counter {
	private value_: number;
	private readonly waiters: Waiter_[] = [];

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

	/**
	 * Resets the counter to zero.
	 */
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
	async wait(targetValue: number, signal?: AbortSignal | null): Promise<void> {
		const deferred = Promise.withResolvers<void>();

		const waiter: Waiter_ = {
			resolve: deferred.resolve,
			targetValue,
		};

		this.waiters.push(waiter);

		const handleAbort = () => {
			deferred.reject(signal?.reason);
		};

		try {
			signal?.throwIfAborted();
			signal?.addEventListener("abort", handleAbort, {
				once: true,
			});

			if (this.value === targetValue) {
				deferred.resolve();
				return;
			}

			await deferred.promise;
		} finally {
			signal?.removeEventListener("abort", handleAbort);
			removeSafe(this.waiters, waiter);
		}
	}

	private handleWaiters(value: number): void {
		// Take a snapshot of the waiters to avoid concurrency issues
		for (const waiter of this.waiters.slice()) {
			if (waiter.targetValue === value) {
				waiter.resolve();
			}
		}
	}
}
