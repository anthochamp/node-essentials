import { Queue } from "../../data/queue.js";
import { serializeQueueNext } from "../../ecma/function/serialize-queue-next.js";
import type { PromiseResolve } from "../../ecma/promise/types.js";
import { Mutex } from "./mutex.js";

/**
 * A signal primitive for signaling between async tasks.
 *
 * When the signal is in the signaled state, calls to `wait` will resolve
 * immediately. When the signal is in the non-signaled state, calls to `wait`
 * will block until the signal is signaled. Waiters are released in FIFO order.
 *
 * The signal can be configured to auto-reset or manual-reset.
 *
 * If `autoReset` is true, the signal will automatically reset to the non-signaled
 * state after a single waiter is released, acting like a binary semaphore.
 * If `autoReset` is false, the signal will remain in the signaled state until
 * it is manually reset.
 *
 * @example
 * const signal = new Signal(true); // autoReset = true
 *
 * // Task 1
 * async function task1() {
 *     console.log("Waiting for signal...");
 *     await signal.wait();
 *     console.log("Signal received!");
 * }
 *
 * // Task 2
 * async function task2() {
 *     console.log("Signaling...");
 *     signal.signal();
 * }
 *
 * task1();
 * task2();
 *
 * @example
 * const signal = new Signal(false); // autoReset = false
 *
 * // Task 1
 * async function task1() {
 *     console.log("Waiting for signal...");
 *     await signal.wait();
 *     console.log("Signal received!");
 * }
 *
 * // Task 2
 * async function task2() {
 *     console.log("Signaling...");
 *     signal.signal();
 * }
 *
 * task1();
 * task2();
 * task1(); // This will also proceed immediately since autoReset is false
 */
export class Signal {
	private signaled_: boolean;
	private readonly waiters = new Queue<PromiseResolve<void>>();
	private readonly waitersLock = new Mutex();
	private readonly handleWaitersSqn = serializeQueueNext(() =>
		this.handleWaiters(),
	);

	/**
	 * Creates a new Signal instance.
	 *
	 * @param autoReset If true, the signal will automatically reset after releasing a waiter.
	 * If false, the signal will remain signaled until manually reset.
	 * @param initialState The initial state of the signal. Default is false (non-signaled).
	 */
	constructor(
		private readonly autoReset: boolean,
		initialState = false,
	) {
		this.signaled_ = initialState;
	}

	/**
	 * Indicates whether the signal is in the signaled state.
	 */
	get signaled(): boolean {
		return this.signaled_;
	}

	/**
	 * Set the signal to signaled state
	 *
	 * Notifies waiting listeners. If `autoReset` is true, only one listener
	 * will be notified and the signal will reset to non-signaled state.
	 * If `autoReset` is false, all listeners will be notified.
	 *
	 * Listeners are notified asynchronously.
	 */
	signal(): void {
		this.signaled_ = true;

		void this.handleWaitersSqn();
	}

	/**
	 * Reset the signal to non-signaled state
	 */
	reset(): void {
		this.signaled_ = false;
	}

	/**
	 * Wait for the signal to be signaled.
	 *
	 * If the signal is already signaled, the listener is called immediately.
	 * If `autoReset` is true, the signal is reset to non-signaled state after
	 * notifying a listener.
	 *
	 * Note: If multiple listeners are waiting and the signal is signaled, only one
	 * listener will be notified if `autoReset` is true. If `autoReset` is false,
	 * all listeners will be notified.
	 *
	 * @param signal An AbortSignal that can be used to cancel the wait operation.
	 * @returns A promise that resolves when the signal is signaled, or rejects when aborted.
	 */
	async wait(signal?: AbortSignal | null): Promise<void> {
		const deferred = Promise.withResolvers<void>();

		await this.waitersLock.lock();
		try {
			this.waiters.enqueue(deferred.resolve);
		} finally {
			this.waitersLock.unlock();
		}

		const handleAbort = () => {
			deferred.reject(signal?.reason);
		};

		try {
			signal?.throwIfAborted();
			signal?.addEventListener("abort", handleAbort, {
				once: true,
			});

			await this.handleWaitersSqn();

			await deferred.promise;
		} finally {
			signal?.removeEventListener("abort", handleAbort);

			await this.waitersLock.lock();
			try {
				this.waiters.removeFirst((item) => item === deferred.resolve);
			} finally {
				this.waitersLock.unlock();
			}
		}
	}

	private async handleWaiters(): Promise<void> {
		const waitersReleased: PromiseResolve<void>[] = [];

		await this.waitersLock.lock();
		try {
			let waiter: PromiseResolve<void> | undefined;
			while (this.signaled_ && (waiter = this.waiters.dequeue())) {
				if (this.autoReset) {
					this.signaled_ = false;
				}
				waitersReleased.push(waiter);
			}
		} finally {
			this.waitersLock.unlock();
		}

		for (const waiter of waitersReleased) {
			waiter();
		}
	}
}
