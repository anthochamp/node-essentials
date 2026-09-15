import { isFinitePositive, WaiterQueue } from "@ac-kit/core";

import { CollectionCapacityExceededError } from "./ibounded.js";

/**
 * Internal capacity semaphore for bounded collections.
 *
 * A thin counting-permit wrapper over `@ac-kit/core`'s `WaiterQueue` — the same
 * primitive `@ac-kit/async`'s `Semaphore` is built from. This class exists only
 * because `@ac-kit/async`'s `Semaphore` itself can't be imported here:
 * `async`'s `Channel`/`Broadcast` depend on this package's `Queue`/ `Deque`, so
 * the reverse edge would be circular. `WaiterQueue` lives in `core` — a
 * dependency this package already has — specifically so both sides can share it
 * without that cycle.
 *
 * Do not export this class — it is an implementation detail of bounded
 * collections.
 */
export class CapacitySemaphore {
	private value_: number;
	// Metadata is the permit count the waiter is blocked on.
	private readonly waiters = new WaiterQueue<void, number>();

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

	get value(): number {
		return this.value_;
	}

	tryAcquire(count = 1): boolean {
		if (!isFinitePositive(count)) {
			throw new RangeError("Count must be positive");
		}

		if (this.value_ >= count) {
			this.value_ -= count;

			// mitigate concurrency issues
			if (this.value_ < 0) {
				this.value_ += count;
				return false;
			}

			return true;
		}

		return false;
	}

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

	/**
	 * Same as `tryAcquire`, but throws instead of returning `false` — the pattern
	 * every bounded collection repeats at its append/insert call sites.
	 */
	tryAcquireOrThrow(count = 1): void {
		if (!this.tryAcquire(count)) {
			throw new CollectionCapacityExceededError(this.maxValue);
		}
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
