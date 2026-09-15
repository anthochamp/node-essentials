type Entry_<T, E> = {
	resolve: (value: T) => void;
	extra: E;
};

/**
 * A FIFO queue of pending promise resolvers, with abort-signal cancellation
 * built in once.
 *
 * @template T The value a released waiter's promise resolves with.
 * @template E Per-waiter metadata a release policy can inspect via `peek` or
 *   `releaseMatching` — e.g. how many permits a `Semaphore` acquisition needs,
 *   or the target value a `Counter` wait is for. Defaults to `void` for
 *   policies with nothing to inspect (a plain FIFO release, as `Mutex` and
 *   `Condition` use).
 */
export class WaiterQueue<T = void, E = void> {
	private readonly entries: Entry_<T, E>[] = [];

	/** Number of waiters currently queued. */
	get size(): number {
		return this.entries.length;
	}

	/** The metadata of the longest-waiting entry, or `undefined` if empty. */
	peek(): E | undefined {
		return this.entries[0]?.extra;
	}

	/**
	 * Registers a new waiter and returns a promise that resolves with the value
	 * passed to whichever release call resolves it, or rejects if `signal` aborts
	 * first.
	 *
	 * @param extra Per-waiter metadata, inspected later via `peek` or
	 *   `releaseMatching`.
	 * @param signal Optional abort signal to cancel the wait.
	 */
	enqueue(extra: E, signal?: AbortSignal | null): Promise<T> {
		if (signal?.aborted) {
			return Promise.reject(signal.reason);
		}

		return new Promise<T>((resolve, reject) => {
			const entry: Entry_<T, E> = { resolve, extra };
			this.entries.push(entry);

			if (signal) {
				const handleAbort = () => {
					const index = this.entries.indexOf(entry);
					if (index !== -1) {
						this.entries.splice(index, 1);
					}
					reject(signal.reason);
				};
				signal.addEventListener("abort", handleAbort, { once: true });
				// Removing the listener here — not a flag — is what keeps a settled
				// waiter from being rejected again by a later abort.
				entry.resolve = (value) => {
					signal.removeEventListener("abort", handleAbort);
					resolve(value);
				};
			}
		});
	}

	/** Removes and resolves the longest-waiting entry, if any. */
	releaseNext(value: T): boolean {
		const entry = this.entries.shift();
		entry?.resolve(value);
		return entry !== undefined;
	}

	/** Removes and resolves every currently queued entry, in queue order. */
	releaseAll(value: T): number {
		const released = this.entries.splice(0, this.entries.length);
		for (const entry of released) {
			entry.resolve(value);
		}
		return released.length;
	}

	/**
	 * Removes and resolves every entry whose metadata matches `predicate`, in
	 * queue order — for release policies that aren't a FIFO prefix (e.g.
	 * `Counter`, which releases whichever waiters target the new value,
	 * regardless of queue position).
	 */
	releaseMatching(predicate: (extra: E) => boolean, value: T): number {
		const released: Entry_<T, E>[] = [];

		for (let i = this.entries.length - 1; i >= 0; i--) {
			if (predicate(this.entries[i]!.extra)) {
				released.push(this.entries[i]!);
				this.entries.splice(i, 1);
			}
		}

		for (let i = released.length - 1; i >= 0; i--) {
			released[i]!.resolve(value);
		}

		return released.length;
	}
}
