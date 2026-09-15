import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Fans one iterable out to `count` independent iterators over the same
 * elements.
 *
 * The async counterpart of `tee`. Anything one branch has read that another has
 * not yet reached is buffered — the span between the slowest and the fastest
 * consumer, and nothing more.
 *
 * Branches may be advanced concurrently. A pull from the source is shared:
 * branches that need the same not-yet-read element all await the one in-flight
 * read rather than issuing their own, so the source is never advanced twice for
 * one element.
 *
 * Time complexity: O(1) amortised per element per branch. Memory: O(span).
 *
 * @param iterable The iterable to fan out, sync or async.
 * @param count How many branches to produce. Must be a non-negative integer.
 * @returns One iterator per branch, each yielding every element of the source.
 * @throws {RangeError} If `count` is not a non-negative integer.
 */
export function teeAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	count = 2,
): AsyncIterableIterator<T>[] {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("teeAsync count must be a non-negative integer");
	}

	const iterator = asyncIteratorOf_(iterable);
	const buffer: T[] = [];
	const cursors = Array.from<number>({ length: count }).fill(0);
	let bufferStart = 0;
	let exhausted = false;
	let pending: Promise<void> | undefined;

	async function readOne_(): Promise<void> {
		const result = await iterator.next();

		if (result.done === true) {
			exhausted = true;
		} else {
			buffer.push(result.value);
		}

		pending = undefined;
	}

	// Branches racing for the same unread element share one read: whoever
	// arrives first starts it, the rest await the promise it left behind.
	function pullOne_(): Promise<void> {
		pending ??= readOne_();

		return pending;
	}

	async function* branch(id: number): AsyncIterableIterator<T> {
		while (true) {
			const wanted = cursors[id]!;

			while (wanted === bufferStart + buffer.length && !exhausted) {
				await pullOne_();
			}

			if (wanted === bufferStart + buffer.length) {
				return;
			}

			const value = buffer[wanted - bufferStart]!;
			cursors[id] = wanted + 1;

			let slowest = Number.POSITIVE_INFINITY;
			for (let other = 0; other < cursors.length; other++) {
				if (cursors[other]! < slowest) {
					slowest = cursors[other]!;
				}
			}

			// Compact only once the dead prefix is worth the copy, which keeps the
			// per-element cost amortised O(1) rather than O(span).
			const dead = slowest - bufferStart;
			if (dead > 0 && dead * 2 >= buffer.length) {
				buffer.splice(0, dead);
				bufferStart = slowest;
			}

			yield value;
		}
	}

	return Array.from({ length: count }, (_unused, id) => branch(id));
}
