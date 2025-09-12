import type { ISubscribable } from "./isubscribable.js";
import type { IWaitable } from "./iwaitable.js";
import { Subscribable } from "./subscribable.js";
import { waitNotifiable } from "./wait-notifiable.js";

/**
 * An event that can have subscribers and can be waited on.
 *
 * @template T - Tuple type representing the arguments that will be passed to subscriber functions.
 */
export class SubscribableEvent<T extends unknown[] = []>
	extends Subscribable<T>
	implements ISubscribable<T>, IWaitable<never[], T>
{
	/**
	 * Trigger an event, calling all registered subscribers.
	 */
	trigger(...args: T): void {
		this.publish(...args);
	}

	/**
	 * Wait for the next event to be triggered.
	 *
	 * @param signal Optional abort signal to cancel the wait.
	 * @returns A promise that resolves when the event is triggered.
	 */
	async wait(signal?: AbortSignal | null): Promise<T> {
		return await waitNotifiable(this, signal);
	}
}
