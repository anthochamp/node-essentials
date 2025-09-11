import { debounceQueue } from "../ecma/function/debounce-queue.js";
import type { Callable } from "../ecma/function/types.js";
import { AbortablePromise } from "../ecma/promise/abortable-promise.js";
import type { PromiseResolve } from "../ecma/promise/types.js";

type SemaphorePendingAcquisition = {
	count: number;
	resolve: PromiseResolve<void>;
};

/**
 * A counting semaphore implementation.
 *
 * A semaphore maintains a set of permits. Each `acquire` call blocks if necessary
 * until a permit is available, and then takes it. Each `release` call adds a permit,
 * potentially releasing a blocking acquirer.
 *
 * The semaphore is initialized with a given number of permits. The number of
 * permits can be increased up to a maximum value.
 */
export class Semaphore {
	private value_: number;

	// FIFO queue using array, do not use Queue class because of circular dependency
	private pendingAcquisitions: SemaphorePendingAcquisition[] = [];

	// Also, we cannot use a Mutex lock here because of circular dependency, so we
	// use a debounced function, but be careful to not call processPendingAcquisitions
	// directly, and to always use the debounced version.
	private processPendingAcquisitionsDebounced = debounceQueue(async () =>
		this.processPendingAcquisitions(),
	);

	/**
	 * Creates a new semaphore with the given initial number of permits and maximum number of permits.
	 *
	 * @param maxValue The maximum number of permits.
	 * @param value The initial number of permits available. Defaults to `maxValue`.
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
	 */
	get value(): number {
		return this.value_;
	}

	/**
	 * The maximum number of permits.
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
			return true;
		}
		return false;
	}

	/**
	 * Acquires a permit from the semaphore, waiting if necessary until one is available.
	 *
	 * @param signal An optional AbortSignal to cancel the acquire operation.
	 * @returns A promise that resolves to a function that releases the acquired permit.
	 */
	async acquire(count = 1, signal?: AbortSignal | null): Promise<Callable> {
		if (this.tryAcquire(count)) {
			return () => this.release(count);
		}

		const deferred = AbortablePromise.withResolvers<void>({
			signal,
			onAbort: (error: unknown) => {
				this.pendingAcquisitions.splice(
					this.pendingAcquisitions.indexOf(pendingAcquisition),
					1,
				);

				deferred.reject(error);
			},
		});

		const pendingAcquisition: SemaphorePendingAcquisition = {
			count,
			resolve: deferred.resolve,
		};
		this.pendingAcquisitions.push(pendingAcquisition);

		// Process the queue in case there are immediately available permits
		await this.processPendingAcquisitionsDebounced();

		await deferred.promise;

		return () => this.release(count);
	}

	/**
	 * Releases a permit, returning it to the semaphore.
	 */
	release(count: number): void {
		if (!Number.isFinite(count) || count < 0) {
			throw new RangeError("Count must be positive");
		}
		if (this.value_ + count > this.maxValue) {
			throw new RangeError("Semaphore released too many times");
		}

		this.value_ += count;
		this.processPendingAcquisitionsDebounced();
	}

	private processPendingAcquisitions() {
		let next: SemaphorePendingAcquisition | undefined;
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
