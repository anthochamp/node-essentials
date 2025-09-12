import { Queue } from "../data/queue.js";
import { debounceQueue } from "../ecma/function/debounce-queue.js";
import { noThrow } from "../ecma/function/no-throw.js";
import type { Callable } from "../ecma/function/types.js";
import { AbortablePromise } from "../ecma/promise/abortable-promise.js";
import type { ISubscribable } from "./isubscribable.js";
import type { IWaitable } from "./iwaitable.js";
import { Subscribable } from "./subscribable.js";

/**
 * A synchronization primitive that can be in a signaled or non-signaled state.
 *
 * When the signal is in the signaled state, calls to `wait` will resolve immediately.
 * When the signal is in the non-signaled state, calls to `wait` will block until
 * the signal is signaled.
 *
 * If `autoReset` is true, the signal will automatically reset to the non-signaled
 * state after a single waiter is released.
 * If `autoReset` is false, the signal will remain in the signaled state until it
 * is manually reset.
 */
export class Signal
	extends Subscribable<[boolean]>
	implements IWaitable, ISubscribable<[boolean]>
{
	private signaled_: boolean;
	private pendingWaiters = new Queue<Callable>();
	private processWaitersDebounced = debounceQueue(async () =>
		this.processPendingWaiters(),
	);

	constructor(
		private readonly autoReset = false,
		initialState = false,
	) {
		super();

		this.signaled_ = initialState;
		this.subscribe(() => this.processWaitersDebounced());
	}

	/**
	 * Indicates whether the signal is in the signaled state.
	 */
	get signaled(): boolean {
		return this.signaled_;
	}

	/**
	 * Set the signal to signaled state
	 */
	signal(): void {
		this.signaled_ = true;
		this.publish(true);
	}

	/**
	 * Reset the signal to non-signaled state
	 */
	reset(): void {
		this.signaled_ = false;
		this.publish(false);
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
		const deferred = AbortablePromise.withResolvers<void>({
			signal,
			onAbort: (error: unknown) => {
				this.pendingWaiters.removeFirst((item) => item === deferred.resolve);

				deferred.reject(error);
			},
		});

		this.pendingWaiters.enqueue(deferred.resolve);

		// In case the signal was already signaled, process pending waiters
		await this.processWaitersDebounced();

		return deferred.promise;
	}

	private processPendingWaiters() {
		while (this.signaled_) {
			const waiter = this.pendingWaiters.dequeue();
			if (!waiter) {
				break;
			}

			if (this.autoReset) {
				this.signaled_ = false;
			}

			noThrow(waiter)();
		}
	}
}
