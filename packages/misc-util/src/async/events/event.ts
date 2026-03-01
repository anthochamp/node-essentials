import { EventDispatcherBase } from "./_event-dispatcher-base.js";
import type { IEventDispatcher } from "./ievent-dispatcher.js";

/**
 * An event that can be emitted with data of type `T` and waited upon.
 *
 * @example
 * ```ts
 * const event = new Event<number>();
 *
 * // Subscriber
 * event.subscribe((data) => {
 * 	 console.log("Event received with data:", data);
 * });
 *
 * // Emitter
 * event.emit(42);
 *
 * // Waiter
 * const data = await event.wait();
 * console.log("Waited event received with data:", data);
 * ```
 *
 * @template T - The type of data emitted with the event.
 */
export class Event<T>
	extends EventDispatcherBase<[T]>
	implements IEventDispatcher<[T]>
{
	emit(data: T): void {
		this.dispatch(data);
	}
}
