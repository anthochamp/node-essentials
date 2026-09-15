import { isFinitePositive, WaiterQueue } from "@ac-kit/core";

/**
 * A general/counting strong semaphore implementation.
 *
 * A semaphore maintains a set of permits. Each `acquire` call blocks if
 * necessary until a permit is available, and then takes it. Each `release` call
 * adds a permit, potentially releasing a blocking acquirer.
 *
 * The semaphore is initialized with a given number of permits. The number of
 * permits can be increased up to a maximum value.
 *
 * The order of permit acquisition is guaranteed to be FIFO.
 *
 * Usage: Only meaningful when the critical section contains at least one
 * `await` — synchronous operations cannot be interleaved in JS's
 * single-threaded model.
 */
export class Semaphore {
	private value_: number;
	// Metadata is the permit count the waiter is blocked on.
	private readonly waiters = new WaiterQueue<void, number>();

	/**
	 * Creates a new semaphore with the given initial number of permits and
	 * maximum number of permits.
	 *
	 * @param maxValue The maximum number of permits.
	 * @param initialValue The initial number of permits available. Defaults to
	 *   `maxValue`.
	 */
	constructor(
		private readonly maxValue: number,
		initialValue?: number,
	) {
		initialValue = initialValue ?? maxValue;

		if (initialValue < 0) {
			throw new RangeError("Initial value must be non-negative");
		}
		if (initialValue > maxValue) {
			throw new RangeError("Initial value must not exceed maxValue");
		}

		this.value_ = initialValue;
	}

	/**
	 * The current number of available permits.
	 *
	 * @returns The current number of available permits.
	 */
	get value(): number {
		return this.value_;
	}

	/**
	 * The maximum number of permits.
	 *
	 * @returns The maximum number of permits.
	 */
	getMaxValue(): number {
		return this.maxValue;
	}

	/**
	 * Tries to acquire a permit from the semaphore immediately, without waiting.
	 *
	 * @param count The number of permits to acquire.
	 * @returns `true` if the permits were acquired, `false` otherwise.
	 */
	tryAcquire(count = 1): boolean {
		if (!isFinitePositive(count)) {
			throw new RangeError("Count must be positive");
		}

		if (this.value_ >= count) {
			this.value_ -= count;
			return true;
		}

		return false;
	}

	/**
	 * Acquires a permit from the semaphore, waiting if necessary until one is
	 * available.
	 *
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns A promise that resolves to a lease when the permits are acquired.
	 */
	acquire(count = 1, signal?: AbortSignal | null): Promise<void> {
		if (!isFinitePositive(count)) {
			throw new RangeError("Count must be positive");
		}

		// Fast path: no waiters and permit available — skip the queue entirely
		if (this.waiters.size === 0 && this.value_ >= count) {
			if (signal?.aborted) return Promise.reject(signal.reason);
			this.value_ -= count;
			return Promise.resolve();
		}

		return this.waiters.enqueue(count, signal);
	}

	/**
	 * Releases permits back to the semaphore.
	 *
	 * Any pending acquisitions will be processed asynchronously after this call.
	 *
	 * @param count The number of permits to release.
	 */
	release(count = 1): void {
		if (!isFinitePositive(count)) {
			throw new RangeError("Count must be positive");
		}
		if (this.value_ + count > this.maxValue) {
			throw new RangeError("Semaphore released too many times");
		}

		this.value_ += count;

		this.handlePendingAcquisitions();
	}

	private handlePendingAcquisitions(): void {
		while (true) {
			const count = this.waiters.peek();
			if (count === undefined || this.value_ < count) {
				break;
			}

			this.value_ -= count;
			this.waiters.releaseNext(undefined);
		}
	}
}
