import type { ISubscribable } from "./isubscribable.js";
import type { IWaitable } from "./iwaitable.js";
import { Subscribable } from "./subscribable.js";
import { waitNotifiable } from "./wait-notifiable.js";

/**
 * A simple counter that can be incremented or decremented, and allows waiting
 * for it to reach a specific value.
 */
export class Counter
	extends Subscribable<[number]>
	implements ISubscribable<[number]>, IWaitable<[number]>
{
	private value_: number;

	/**
	 * Creates a new Counter instance.
	 *
	 * @param initialValue The initial value of the counter. Default is `0`.
	 */
	constructor(initialValue = 0) {
		super();

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
		this.publish(this.value_);
	}

	/**
	 * Increments the counter by one.
	 *
	 * @returns The new value of the counter after incrementing.
	 */
	increment(): number {
		this.publish(++this.value_);
		return this.value_;
	}

	/**
	 * Decrements the counter by one.
	 *
	 * @returns The new value of the counter after decrementing.
	 */
	decrement(): number {
		this.publish(--this.value_);
		return this.value_;
	}

	/**
	 * Waits until the counter reaches the specified target value.
	 *
	 * @param targetValue The value to wait for.
	 * @param signal An optional AbortSignal to cancel the wait.
	 */
	async wait(targetValue: number, signal?: AbortSignal | null): Promise<void> {
		let value = this.value;

		while (value !== targetValue) {
			[value] = await waitNotifiable(this, signal);
		}
	}
}
