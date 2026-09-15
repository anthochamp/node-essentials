import { compact, type DefinedValue, type PromiseResolve } from "@ac-kit/core";
import { BlockingQueue, type IQueue, LinkedList, Queue } from "@ac-kit/data";

import { Condition } from "./condition.js";
import { Mutex } from "./mutex.js";

/** Error thrown when attempting to use a closed Channel. */
export class ChannelClosedError extends Error {
	constructor() {
		super("Channel is closed");
		this.name = "ChannelClosedError";
	}
}

/**
 * An asynchronous channel for sending and receiving messages between tasks.
 *
 * Supports both rendezvous (capacity = 0) and buffered (capacity > 0) modes.
 *
 * @example
 * 	const ch = new Channel<number>(0); // Rendezvous channel
 *
 * 	// Sender task
 * 	async function sender() {
 * 	await ch.send(42);
 * 	console.log("Message sent");
 * 	}
 *
 * 	// Receiver task
 * 	async function receiver() {
 * 	const msg = await ch.receive();
 * 	console.log("Received message:", msg);
 * 	}
 * 	// Start sender and receiver
 * 	sender();
 * 	receiver();
 * 	```
 *
 * 	@example
 * 	const ch = new Channel<string>(10); // Buffered channel with capacity 10
 *
 * 	// Sender task
 * 	async function sender() {
 * 	for (let i = 0; i < 20; i++) {
 * 	await ch.send(`Message ${i}`);
 * 	console.log(`Sent: Message ${i}`);
 * 	}
 * 	}
 *
 * 	// Receiver task
 * 	async function receiver() {
 * 	for (let i = 0; i < 20; i++) {
 * 	const msg = await ch.receive();
 * 	console.log(`Received: ${msg}`);
 * 	}
 * 	}
 *
 * 	// Start sender and receiver
 * 	sender();
 * 	receiver();
 *
 * 	@template T The type of messages carried. Anything except `undefined`, which
 * 	the channel reserves for "no message".
 */
export class Channel<T extends DefinedValue> {
	// Not a Queue: an in-flight receive can be cancelled and must be removable
	// from the middle, which the Queue ADT deliberately doesn't expose.
	private readonly receivers = new LinkedList<PromiseResolve<T>>();
	private readonly receiversLock = new Mutex();
	private readonly newReceiver = new Condition();
	private readonly messages: IQueue<T>;
	/** Waits for room on a bounded channel; resolves at once on an unbounded one. */
	private readonly bufferMessage: (
		message: T,
		signal?: AbortSignal | null,
	) => Promise<void>;
	private readonly closeController = new AbortController();

	/**
	 * Create a new Channel with the given capacity.
	 *
	 * A capacity of 0 creates a rendezvous channel where sends and receives must
	 * be paired. A capacity greater than 0 creates a buffered channel.
	 *
	 * @example
	 * 	const rendezvousChannel = new Channel<number>(0);
	 * 	const bufferedChannel = new Channel<string>(5);
	 *
	 * @example
	 * 	const ch = new Channel<number>(3); // Buffered channel with capacity 3
	 * 	await ch.send(1);
	 * 	await ch.send(2);
	 * 	await ch.send(3);
	 * 	// The next send will wait until a receive occurs
	 * 	const sendPromise = ch.send(4);
	 * 	const msg = await ch.receive(); // Receives 1
	 * 	await sendPromise; // Now the send of 4 completes
	 *
	 * @example
	 * 	const ch = new Channel<number>(0); // Rendezvous channel
	 * 	const sendPromise = ch.send(42); // This will wait for a receiver
	 * 	const msg = await ch.receive(); // Receives 42, unblocking the sender
	 * 	await sendPromise; // Now the send completes
	 *
	 * @param capacity The channel capacity (0 for rendezvous, >0 for buffered).
	 * @throws {RangeError} If capacity is negative.
	 */
	constructor(readonly capacity: number = Infinity) {
		if (capacity < 0) {
			throw new RangeError("Channel capacity cannot be negative");
		}

		if (capacity === Infinity) {
			const messages = new Queue<T>();

			this.messages = messages;
			this.bufferMessage = async (message) => {
				messages.enqueue(message);
			};
		} else {
			const messages = new BlockingQueue<T>(undefined, { capacity });

			this.messages = messages;
			this.bufferMessage = (message, signal) =>
				messages.waitEnqueue(message, signal);
		}
	}

	/**
	 * Indicates whether the channel is closed.
	 *
	 * @returns True if the channel is closed, false otherwise.
	 */
	get closed(): boolean {
		return this.closeController.signal.aborted;
	}

	/**
	 * Send a message through the channel.
	 *
	 * If the channel capacity is zero ("rendezvous" channel), this will wait for
	 * a receiver to be ready.
	 *
	 * If the capacity is greater than zero (buffered), this will buffer the
	 * message or wait if the buffer is full. If a receiver is waiting, the
	 * message is delivered directly to the receiver.
	 *
	 * @param message The message to send.
	 * @returns A promise that resolves when the message has been sent.
	 * @throws {ChannelClosedError} If the channel is closed.
	 */
	async send(message: T, signal?: AbortSignal | null): Promise<void> {
		const signal_ = AbortSignal.any(
			Array.from(compact([this.closeController.signal, signal])),
		);

		if (this.capacity === 0) {
			await this.receiversLock.lock(signal_);

			try {
				let receiver: PromiseResolve<T> | undefined;
				while (!(receiver = this.receivers.popFront())) {
					await this.newReceiver.wait(this.receiversLock, signal_);
				}

				receiver(message);
			} finally {
				this.receiversLock.unlock();
			}
		} else {
			await this.receiversLock.lock(signal_);

			try {
				const receiver = this.receivers.popFront();

				if (receiver) {
					receiver(message);
					return;
				}
			} finally {
				this.receiversLock.unlock();
			}

			await this.bufferMessage(message, signal_);
		}
	}

	/**
	 * Wait to receive a message from the channel.
	 *
	 * If multiple receivers are waiting, the oldest receiver will be served first
	 * (FIFO).
	 *
	 * @param signal An optional AbortSignal to cancel the receive operation.
	 * @returns A promise that resolves to the received message.
	 * @throws {ChannelClosedError} If the channel is closed.
	 */
	async receive(signal?: AbortSignal | null): Promise<T> {
		const signal_ = AbortSignal.any(
			Array.from(compact([this.closeController.signal, signal])),
		);

		const deferred = Promise.withResolvers<T>();

		this.receivers.pushBack(deferred.resolve);
		this.newReceiver.signal();

		const handleAbort = () => {
			deferred.reject(signal_?.reason);
		};

		let message: T | undefined;
		try {
			signal_?.throwIfAborted();
			signal_?.addEventListener("abort", handleAbort, {
				once: true,
			});

			message = this.messages.dequeue();
			if (message !== undefined) {
				deferred.resolve(message);
			}

			message = await deferred.promise;
		} finally {
			signal_?.removeEventListener("abort", handleAbort);
			this.receivers.removeFirst((item) => item === deferred.resolve);
		}

		return message;
	}

	/**
	 * Close the channel. All pending and future receives will reject.
	 *
	 * If the channel is already closed, this is a no-op.
	 *
	 * Any pending producers/receivers will be rejected with ChannelClosedError.
	 */
	close(): void {
		if (this.closed) {
			return;
		}

		this.closeController.abort(new ChannelClosedError());
	}
}
