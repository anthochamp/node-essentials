import { Deque } from "../../data/deque.js";
import { compact } from "../../ecma/array/compact.js";
import type { Callable } from "../../ecma/function/types.js";
import { ChannelClosedError } from "./channel.js";
import { Condition } from "./condition.js";
import { Mutex } from "./mutex.js";

/**
 * Error thrown when a broadcast subscriber has lagged behind and missed messages.
 *
 * @example
 * try {
 *     const msg = await subscriber.receive();
 * } catch (error) {
 *     if (error instanceof BroadcastSubscriberLaggedError) {
 *         console.error(`Missed ${error.missed} messages`);
 *     } else {
 *         throw error;
 * 		}
 * }
 */
export class BroadcastSubscriberLaggedError extends Error {
	constructor(public readonly missed: number) {
		super(`Missed ${missed} messages`);
		this.name = "BroadcastSubscriberLaggedError";
	}
}

/**
 * A subscriber to a Broadcast channel.
 */
export interface IBroadcastSubscriber<T> {
	/**
	 * Indicates whether the subscriber is closed.
	 *
	 * @returns true if the subscriber is closed, false otherwise.
	 */
	readonly closed: boolean;

	/**
	 * Closes the subscriber.
	 *
	 * This will prevent further messages from being received.
	 * Any pending receive operations will be aborted.
	 */
	close(): void;

	/**
	 * Wait to receive a message from the broadcast channel.
	 *
	 * @throws {BroadcastSubscriberLaggedError} If the subscriber has lagged behind and missed messages.
	 * @param signal An optional AbortSignal to cancel the receive operation.
	 */
	receive(signal?: AbortSignal | null): Promise<T>;
}

/**
 * A broadcast channel that allows multiple subscribers to receive messages.
 *
 * Each subscriber maintains its own message queue with a specified capacity.
 * If a subscriber's queue is full when a new message is sent, the oldest message
 * in that subscriber's queue is discarded to make room for the new message.
 *
 * @example
 * const broadcast = new Broadcast<number>(5); // Capacity of 5 messages per subscriber
 *
 * // Subscriber 1
 * const subscriber1 = broadcast.subscribe();
 * function listen1() {
 *     while (!subscriber1.closed) {
 *         const msg = await subscriber1.receive();
 *         console.log("Subscriber 1 received:", msg);
 *     }
 * }
 * listen1();
 *
 * // Subscriber 2
 * const subscriber2 = broadcast.subscribe();
 * function listen2() {
 *     while (!subscriber2.closed) {
 *         const msg = await subscriber2.receive();
 *         console.log("Subscriber 2 received:", msg);
 *     }
 * }
 * listen2();
 *
 * // Send messages
 * await broadcast.send(1);
 * await broadcast.send(2);
 *
 * // Close the broadcast channel
 * broadcast.close();
 */
export class Broadcast<T> {
	private readonly subscribers = new Set<Subscriber_<T>>();
	private readonly closeController = new AbortController();

	/**
	 * Creates a new Broadcast channel.
	 *
	 * All subscribers will have their own message queue with the specified
	 * capacity.
	 *
	 * @throws {RangeError} If the capacity is less than or equal to zero.
	 * @param capacity The capacity of each subscriber's message queue.
	 */
	constructor(private readonly capacity: number) {
		if (capacity <= 0) {
			throw new RangeError("Capacity must be greater than zero");
		}
	}

	/**
	 * Indicates whether the broadcast channel is closed.
	 */
	get closed(): boolean {
		return this.closeController.signal.aborted;
	}

	/**
	 * Subscribe to the broadcast channel.
	 *
	 * @returns A new subscriber to the broadcast channel.
	 */
	subscribe(): IBroadcastSubscriber<T> {
		if (this.closed) {
			throw new ChannelClosedError();
		}

		const subscriber = new Subscriber_<T>(
			this.capacity,
			this.closeController.signal,
			() => {
				this.subscribers.delete(subscriber);
			},
		);

		this.subscribers.add(subscriber);

		return subscriber;
	}

	/**
	 * Sends a message to all subscribers.
	 *
	 * @param message The message to send.
	 * @param signal An optional AbortSignal to cancel the send operation.
	 * @returns A promise that resolves when the message has been sent to all subscribers.
	 */
	async send(message: T, signal?: AbortSignal | null): Promise<void> {
		if (this.closed) {
			throw new ChannelClosedError();
		}

		const signal_ = AbortSignal.any(
			compact([this.closeController.signal, signal]),
		);

		for (const subscriber of this.subscribers.values()) {
			try {
				await subscriber.enqueue(message, signal_);
			} catch (error) {
				// Ignore closed subscriptions
				if (!(error instanceof ChannelClosedError)) {
					throw error;
				}
			}
		}
	}

	/**
	 * Closes the broadcast channel.
	 */
	close(): void {
		if (this.closed) {
			return;
		}

		this.closeController.abort(new ChannelClosedError());
	}
}

class Subscriber_<T> implements IBroadcastSubscriber<T> {
	private readonly messages: Deque<T>;
	private readonly messagesLock = new Mutex();
	private readonly newMessage = new Condition();
	private readonly closeController = new AbortController();
	private lagCount = 0;

	constructor(
		private readonly capacity: number,
		private readonly parentCloseSignal: AbortSignal,
		private readonly onUnsubscribe: Callable,
	) {
		this.messages = new Deque<T>([], capacity);
	}

	get closed(): boolean {
		return (
			this.parentCloseSignal.aborted || this.closeController.signal.aborted
		);
	}

	async enqueue(message: T, signal?: AbortSignal | null): Promise<void> {
		const signal_ = AbortSignal.any(
			compact([this.parentCloseSignal, this.closeController.signal, signal]),
		);

		await this.messagesLock.lock(signal_);
		try {
			if (this.messages.count() >= this.capacity) {
				this.messages.shift(); // Remove oldest
				this.lagCount++;
			}
			this.messages.push(message);
			await this.newMessage.signal();
		} finally {
			this.messagesLock.unlock();
		}
	}

	async receive(signal?: AbortSignal | null): Promise<T> {
		const signal_ = AbortSignal.any(
			compact([this.parentCloseSignal, this.closeController.signal, signal]),
		);

		await this.messagesLock.lock(signal_);
		try {
			if (this.lagCount > 0) {
				const missed = this.lagCount;
				this.lagCount = 0;
				throw new BroadcastSubscriberLaggedError(missed);
			}
			let message: T | undefined;
			while (!(message = this.messages.shift())) {
				await this.newMessage.wait(this.messagesLock, signal_);
			}
			return message;
		} finally {
			this.messagesLock.unlock();
		}
	}

	close(): void {
		if (this.closed) {
			return;
		}
		this.closeController.abort(new ChannelClosedError());
		this.onUnsubscribe();
	}
}
