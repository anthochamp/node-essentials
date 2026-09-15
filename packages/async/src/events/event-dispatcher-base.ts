import { bisectRight } from "@ac-kit/algo";
import type { Callable } from "@ac-kit/core";
import { catchOutOfBandApply } from "@ac-kit/core";

import type {
	EventDispatcherSubscribeOptions,
	EventDispatcherWaitOptions,
	IEventDispatcher,
} from "./ievent-dispatcher.js";

/** One registered listener and everything dispatch needs to know about it. */
type Subscription_<T extends unknown[]> = {
	subscriber: Callable<T>;

	/** The listener, or the self-removing wrapper built for a `once` listener. */
	invoke: Callable<T>;

	priority: number;

	/** Registration order, which breaks ties between equal priorities. */
	sequence: number;

	/**
	 * Set instead of removing the entry outright.
	 *
	 * A `once` listener unsubscribes itself from inside dispatch, and so may any
	 * other listener; splicing the list mid-iteration would skip its neighbour.
	 */
	removed: boolean;
};

/**
 * Dispatch order: higher priority first, ties broken by registration order.
 * Module-level, not a method — it closes over nothing instance-specific, so one
 * copy serves every dispatcher.
 */
function compareSubscriptions_<T extends unknown[]>(
	a: Subscription_<T>,
	b: Subscription_<T>,
): number {
	return b.priority - a.priority || a.sequence - b.sequence;
}

export class EventDispatcherBase<
	T extends unknown[] = never[],
> implements IEventDispatcher<T> {
	/** Kept in dispatch order, so dispatch itself only has to walk it. */
	private readonly sortedSubscriptions: Subscription_<T>[] = [];

	private readonly bySubscriber = new Map<Callable<T>, Subscription_<T>>();
	private sequence = 0;
	private removedCount = 0;

	subscribe(
		subscriber: Callable<T>,
		options?: EventDispatcherSubscribeOptions,
	): Callable | null {
		if (this.bySubscriber.has(subscriber)) {
			return null;
		}

		const subscription: Subscription_<T> = {
			subscriber,
			invoke: subscriber,
			priority: options?.priority ?? 0,
			sequence: this.sequence++,
			removed: false,
		};

		if (options?.once) {
			subscription.invoke = (...args: T) => {
				this.unsubscribe(subscriber);
				subscriber(...args);
			};
		}

		this.bySubscriber.set(subscriber, subscription);
		const index = bisectRight(
			this.sortedSubscriptions,
			subscription,
			compareSubscriptions_,
		);
		this.sortedSubscriptions.splice(index, 0, subscription);

		return () => this.unsubscribe(subscriber);
	}

	unsubscribe(subscriber: Callable<T>): void {
		const subscription = this.bySubscriber.get(subscriber);
		if (!subscription) {
			return;
		}

		this.bySubscriber.delete(subscriber);
		subscription.removed = true;
		this.removedCount++;
	}

	isSubscribed(subscriber: Callable<T>): boolean {
		return this.bySubscriber.has(subscriber);
	}

	wait(options?: EventDispatcherWaitOptions<T>): Promise<T> {
		const signal = options?.signal;
		if (signal?.aborted) return Promise.reject(signal.reason);

		return new Promise<T>((resolve, reject) => {
			if (signal?.aborted) {
				reject(signal.reason);
				return;
			}

			let handleAbort: (() => void) | undefined;
			let unsubscribe: Callable | null = null;
			unsubscribe = this.subscribe((...args: T) => {
				if (!options?.predicate || options.predicate(...args)) {
					if (handleAbort) signal!.removeEventListener("abort", handleAbort);
					unsubscribe?.();
					resolve(args);
				}
			});

			if (signal) {
				handleAbort = () => {
					unsubscribe?.();
					reject(signal.reason);
				};
				signal.addEventListener("abort", handleAbort, { once: true });
			}
		});
	}

	protected dispatch(args: T): void {
		const subscriptions = this.sortedSubscriptions;
		for (let index = 0; index < subscriptions.length; index++) {
			const subscription = subscriptions[index]!;
			if (subscription.removed) {
				continue;
			}

			catchOutOfBandApply(subscription.invoke, args);
		}

		if (this.removedCount > 0) {
			this.compact();
		}
	}

	/** Drops the entries that unsubscribed while a dispatch was walking the list. */
	private compact(): void {
		let target = 0;
		for (const subscription of this.sortedSubscriptions) {
			if (!subscription.removed) {
				this.sortedSubscriptions[target++] = subscription;
			}
		}
		this.sortedSubscriptions.length = target;
		this.removedCount = 0;
	}
}
