import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Drains an iterable without materialising it, for a pipeline whose side
 * effects are the point.
 *
 * The async counterpart of `consume`, and the readable form of an empty-bodied
 * `for await…of`, which reads like a mistake. The iterator is closed when a
 * `count` cuts the drain short.
 *
 * Time complexity: O(min(n, count)). Memory: O(1).
 *
 * @param iterable The iterable to drain, sync or async.
 * @param count How many elements to pull. Must be a non-negative integer or
 *   `Infinity`, the default, which drains to the end.
 * @param signal Aborts the drain.
 * @throws {RangeError} If `count` is negative, fractional or `NaN`.
 */
export async function consumeAsync(
	iterable: MaybeAsyncIterable<unknown>,
	count: number = Number.POSITIVE_INFINITY,
	signal?: AbortSignal,
): Promise<void> {
	if (
		count !== Number.POSITIVE_INFINITY &&
		(!Number.isInteger(count) || count < 0)
	) {
		throw new RangeError(
			"consumeAsync count must be a non-negative integer or Infinity",
		);
	}

	signal?.throwIfAborted();

	const iterator = asyncIteratorOf_(iterable);

	for (let drained = 0; drained < count; drained++) {
		if ((await iterator.next()).done === true) {
			return;
		}

		signal?.throwIfAborted();
	}

	await iterator.return?.();
}
