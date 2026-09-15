import { EventDispatcherBase } from "./event-dispatcher-base.js";
import type { IEventDispatcher } from "./ievent-dispatcher.js";

/**
 * A no-payload event that can be emitted and waited upon — the `Event<T>`
 * sibling for signals that carry no data (e.g. a resize notification).
 *
 * @example
 * 	```ts
 * 	const event = new VoidEvent();
 *
 * 	// Subscriber
 * 	event.subscribe(() => {
 * 		console.log("Event received");
 * 	});
 *
 * 	// Emitter
 * 	event.emit();
 *
 * 	// Waiter
 * 	await event.wait();
 * 	console.log("Waited event received");
 * 	```;
 */
export class VoidEvent
	extends EventDispatcherBase<never[]>
	implements IEventDispatcher<never[]>
{
	emit(): void {
		this.dispatch([]);
	}
}
