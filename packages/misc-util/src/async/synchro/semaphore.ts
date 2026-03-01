import { removeSafe } from "../../ecma/array/remove-safe.js";
import { serializeQueueNext } from "../../ecma/function/serialize-queue-next.js";
import type { PromiseResolve } from "../../ecma/promise/types.js";

type PendingAcquisition_ = {
	count: number;
	resolve: PromiseResolve<void>;
};

/**
 * A general/counting strong semaphore implementation.
 *
 * A semaphore maintains a set of permits. Each `acquire` call blocks if necessary
 * until a permit is available, and then takes it. Each `release` call adds a permit,
 * potentially releasing a blocking acquirer.
 *
 * The semaphore is initialized with a given number of permits. The number of
 * permits can be increased up to a maximum value.
 *
 * The order of permit acquisition is guaranteed to be FIFO.
 */
export class Semaphore {
	private value_: number;
	// we do not use a Queue data structure here because it requires the Semaphore
	private readonly pendingAcquisitions: PendingAcquisition_[] = [];
	private readonly handlePendingAcquisitionsSqn = serializeQueueNext(() =>
		this.handlePendingAcquisitions(),
	);

	/**
	 * Creates a new semaphore with the given initial number of permits and maximum number of permits.
	 *
	 * @param maxValue The maximum number of permits.
	 * @param initialValue The initial number of permits available. Defaults to `maxValue`.
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
		if (!Number.isFinite(count) || count <= 0) {
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

	/**
	 * Acquires a permit from the semaphore, waiting if necessary until one is
	 * available.
	 *
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns A promise that resolves to a lease when the permits are acquired.
	 */
	async acquire(count = 1, signal?: AbortSignal | null): Promise<void> {
		if (!Number.isFinite(count) || count <= 0) {
			throw new RangeError("Count must be positive");
		}

		const deferred = Promise.withResolvers<void>();

		const pendingAcquisition: PendingAcquisition_ = {
			count,
			resolve: deferred.resolve,
		};

		this.pendingAcquisitions.push(pendingAcquisition);

		const handleAbort = () => {
			deferred.reject(signal?.reason);
		};

		try {
			signal?.throwIfAborted();
			signal?.addEventListener("abort", handleAbort, {
				once: true,
			});

			await this.handlePendingAcquisitionsSqn();

			await deferred.promise;
		} finally {
			signal?.removeEventListener("abort", handleAbort);
			removeSafe(this.pendingAcquisitions, pendingAcquisition);
		}
	}

	/**
	 * Releases permits back to the semaphore.
	 *
	 * Any pending acquisitions will be processed asynchronously after this call.
	 *
	 * @param count The number of permits to release.
	 */
	release(count = 1): void {
		if (!Number.isFinite(count) || count < 0) {
			throw new RangeError("Count must be positive");
		}
		if (this.value_ + count > this.maxValue) {
			throw new RangeError("Semaphore released too many times");
		}

		this.value_ += count;

		void this.handlePendingAcquisitionsSqn();
	}

	private handlePendingAcquisitions() {
		let next: PendingAcquisition_ | undefined;
		while ((next = this.pendingAcquisitions.shift()) !== undefined) {
			if (this.value_ < next.count) {
				this.pendingAcquisitions.unshift(next);
				break;
			}

			this.value_ -= next.count;
			next.resolve();
		}
	}
}
