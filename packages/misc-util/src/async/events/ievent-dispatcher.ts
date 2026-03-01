import type { Callable } from "../../ecma/function/types.js";

export type EventDispatcherSubscribeOptions = {
	/**
	 * If true, the listener will be automatically unsubscribed after being called once.
	 *
	 * Default is false.
	 */
	once?: boolean;

	/**
	 * Optional priority used to order listeners when events are dispatched.
	 *
	 * Higher values are invoked before lower values. Listeners with the
	 * same priority are invoked in the order they were registered.
	 *
	 * Default is 0.
	 */
	priority?: number;
};

export type EventDispatcherWaitOptions<T extends unknown[]> = {
	/**
	 * Optional AbortSignal to cancel the wait operation.
	 */
	signal?: AbortSignal | null;

	/**
	 * Optional predicate to filter events.
	 */
	predicate?: (...args: T) => boolean;
};

/**
 * Interface representing an object that allows listeners to register for event dispatching.
 *
 * @template T - Tuple type representing the arguments that will be passed to listener functions.
 */
export interface IEventDispatcher<T extends unknown[] = never[]> {
	/**
	 * Registers a listener function to be called when the event is dispatched.
	 *
	 * If the listener is already registered, this method has no effect.
	 *
	 * @param listener The listener function to call when the event is dispatched.
	 * @param options Optional settings for the subscription.
	 * @returns A function that can be called to unsubscribe the listener, or null if the listener was already registered.
	 */
	subscribe(
		listener: Callable<T>,
		options?: EventDispatcherSubscribeOptions,
	): Callable | null;

	/**
	 * Unregisters a previously registered listener function.
	 *
	 * If the listener is not registered, this method has no effect.
	 *
	 * @param listener The listener function to remove.
	 */
	unsubscribe(listener: Callable<T>): void;

	/**
	 * Tests whether a listener is registered.
	 *
	 * @param listener The listener function to check.
	 * @returns true if the listener is registered, false otherwise.
	 */
	isSubscribed(listener: Callable<T>): boolean;

	/**
	 * Waits for the next occurrence of the event, optionally matching a predicate.
	 *
	 * This is a convenience method that subscribes to the dispatcher,
	 * waits for the next event that matches the predicate (if provided),
	 * and then unsubscribes automatically.
	 *
	 * @param options Optional settings including predicate and abort signal.
	 * @returns A promise that resolves with the next event arguments as an array.
	 */
	wait(options?: EventDispatcherWaitOptions<T>): Promise<T>;
}
