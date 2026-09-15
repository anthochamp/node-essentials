/**
 * Shared contract for every incremental/rolling hash in this package: state
 * mutates as a byte window slides past, and a long-lived instance is pushed one
 * byte at a time — unlike the rest of this package's one-shot `(data) =>
 * digest` functions. Nothing beyond `push`/`value` is guaranteed across every
 * implementation (Gear hash has no fixed window), so nothing else is on this
 * interface; windowed implementations (Buzhash, Rabin fingerprint, Rabin-Karp)
 * each additionally expose their own `readonly windowSize: number`.
 */
export interface IRollingHash<R extends number | bigint = number> {
	/** The rolling hash's current value. */
	readonly value: R;

	/**
	 * Feeds one more byte into the window, returning the updated {@link value}.
	 *
	 * Complexity: O(1).
	 *
	 * @param byteIn - The next byte, 0-255.
	 */
	push(byteIn: number): R;
}
