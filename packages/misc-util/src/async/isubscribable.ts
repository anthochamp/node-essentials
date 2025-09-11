import type { Callback } from "../ecma/function/types.js";

export type SubscribableSubscribeOptions = {
	/**
	 * If true, the subscriber will be automatically unsubscribed after being called once.
	 *
	 * Default is false.
	 */
	once?: boolean;
};

/**
 * Interface representing an object that allows subscribers to register for notifications.
 *
 * @template T - Tuple type representing the arguments that will be passed to subscriber functions.
 */
export interface ISubscribable<T extends unknown[] = never[]> {
	/**
	 * Registers a subscriber function to be called when the event is emitted.
	 *
	 * If the subscriber is already registered, this method has no effect.
	 *
	 * @param subscriber The subscriber function to call when the event is emitted.
	 * @param options Optional settings for the subscription.
	 * @returns A function that can be called to unsubscribe the subscriber, or null if the subscriber was already registered.
	 */
	subscribe(
		subscriber: Callback<T>,
		options?: SubscribableSubscribeOptions,
	): Callback | null;

	/**
	 * Unregisters a previously registered subscriber function.
	 *
	 * If the subscriber is not registered, this method has no effect.
	 *
	 * @param subscriber The subscriber function to remove.
	 */
	unsubscribe(subscriber: Callback<T>): void;

	/**
	 * Tests whether a subscriber is registered.
	 *
	 * @param subscriber The subscriber function to check.
	 * @returns true if the subscriber is registered, false otherwise.
	 */
	isSubscribed(subscriber: Callback<T>): boolean;
}
