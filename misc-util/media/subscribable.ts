import { noThrow } from "../ecma/function/no-throw.js";
import type { Callback } from "../ecma/function/types.js";
import type {
	ISubscribable,
	SubscribableSubscribeOptions,
} from "./isubscribable.js";

export class Subscribable<T extends unknown[] = never[]>
	implements ISubscribable<T>
{
	private readonly subscribers = new Map<Callback<T>, Callback<T>>();

	subscribe(
		subscriber: Callback<T>,
		options?: SubscribableSubscribeOptions,
	): Callback | null {
		if (!this.subscribers.has(subscriber)) {
			if (options?.once) {
				this.subscribers.set(subscriber, (...args: T) => {
					this.subscribers.delete(subscriber);

					noThrow(subscriber).apply(undefined, args);
				});
			} else {
				this.subscribers.set(subscriber, subscriber);
			}

			return () => this.unsubscribe(subscriber);
		}

		return null;
	}

	unsubscribe(subscriber: Callback<T>): void {
		this.subscribers.delete(subscriber);
	}

	isSubscribed(subscriber: Callback<T>): boolean {
		return this.subscribers.has(subscriber);
	}

	protected publish(...args: T): void {
		for (const [, subscriber] of this.subscribers) {
			noThrow(subscriber).apply(undefined, args);
		}
	}
}
