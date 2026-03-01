import type { Callable } from "../../ecma/function/types.js";
import { EventDispatcherBase } from "./_event-dispatcher-base.js";
import type {
	EventDispatcherSubscribeOptions,
	EventDispatcherWaitOptions,
} from "./ievent-dispatcher.js";
import type { IEventDispatcherMap } from "./ievent-dispatcher-map.js";

class EventDispatcher_<T extends unknown[]> extends EventDispatcherBase<T> {
	override dispatch(...args: T): void {
		super.dispatch(...args);
	}
}

export class EventDispatcherMapBase<
	Events extends Record<PropertyKey, unknown[]>,
> implements IEventDispatcherMap<Events>
{
	private readonly dispatchers: {
		[K in keyof Events]?: EventDispatcher_<Events[K]>;
	} = {};

	subscribe<K extends keyof Events>(
		event: K,
		listener: Callable<Events[K]>,
		options?: EventDispatcherSubscribeOptions,
	): Callable | null {
		return this.createDispatcher(event).subscribe(listener, options);
	}

	unsubscribe<K extends keyof Events>(
		event: K,
		listener: Callable<Events[K]>,
	): void {
		this.dispatchers[event]?.unsubscribe(listener);
	}

	isSubscribed<K extends keyof Events>(
		event: K,
		listener: Callable<Events[K]>,
	): boolean {
		return this.dispatchers[event]?.isSubscribed(listener) ?? false;
	}

	wait<K extends keyof Events>(
		event: K,
		options?: EventDispatcherWaitOptions<Events[K]>,
	): Promise<Events[K]> {
		return this.createDispatcher(event).wait(options);
	}

	/**
	 * Dispatches an event to all listeners for the given event name.
	 *
	 * @param event The event name.
	 * @param args Arguments to pass to listeners.
	 */
	protected dispatch<K extends keyof Events>(
		event: K,
		...args: Events[K]
	): void {
		// No need to dispatch if there are no listeners
		this.dispatchers[event]?.dispatch(...args);
	}

	private createDispatcher<K extends keyof Events>(
		event: K,
	): EventDispatcher_<Events[K]> {
		let dispatcher = this.dispatchers[event];
		if (!dispatcher) {
			dispatcher = new EventDispatcher_<Events[K]>();
			this.dispatchers[event] = dispatcher;
		}
		return dispatcher;
	}
}
