import type { Callable } from "../../ecma/function/types.js";
import type {
	EventDispatcherSubscribeOptions,
	EventDispatcherWaitOptions,
} from "./ievent-dispatcher.js";

/**
 * Interface representing an object that allows listeners to register for event
 * dispatching.
 *
 * @template Events - A record mapping event names to their argument tuple types.
 */
export interface IEventDispatcherMap<
	Events extends Record<PropertyKey, unknown[]>,
> {
	/**
	 */
	subscribe<K extends keyof Events>(
		event: K,
		listener: Callable<Events[K]>,
		options?: EventDispatcherSubscribeOptions,
	): Callable | null;

	/**
	 * Unsubscribe a callback from a specific event.
	 * @param event - The event name.
	 * @param listener - The callback to remove.
	 */
	unsubscribe<K extends keyof Events>(
		event: K,
		listener: Callable<Events[K]>,
	): void;

	/**
	 * Check if a callback is subscribed to a specific event.
	 * @param event - The event name.
	 * @param listener - The callback to check.
	 */
	isSubscribed<K extends keyof Events>(
		event: K,
		listener: Callable<Events[K]>,
	): boolean;

	/**
	 * Wait for the next occurrence of a specific event, optionally matching a
	 * predicate.
	 *
	 * This is a convenience method that subscribes to the dispatcher,
	 * waits for the next event that matches the predicate (if provided),
	 * and then unsubscribes automatically.
	 *
	 * @param event The event name to wait for.
	 * @param options Optional settings including predicate and abort signal.
	 * @returns A promise that resolves with the event arguments as an array.
	 */
	wait<K extends keyof Events>(
		event: K,
		options?: EventDispatcherWaitOptions<Events[K]>,
	): Promise<Events[K]>;
}
