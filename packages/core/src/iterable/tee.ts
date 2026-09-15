/**
 * Fans one iterable out to `count` independent iterators over the same
 * elements.
 *
 * An iterator cannot be restarted, so anything one branch has read that another
 * has not yet reached is buffered — the span between the slowest and the
 * fastest consumer, and nothing more. Consumers read at their own pace; a
 * branch that is never advanced pins the buffer at its position, so an
 * abandoned branch should be left out of `count` rather than ignored.
 *
 * Reading the branches in lockstep keeps the buffer at one element. Draining
 * one branch fully before starting the next buffers the whole source.
 *
 * Time complexity: O(1) amortised per element per branch. Memory: O(span).
 *
 * @param iterable The iterable to fan out.
 * @param count How many branches to produce. Must be a non-negative integer.
 * @returns One iterator per branch, each yielding every element of the source.
 * @throws {RangeError} If `count` is not a non-negative integer.
 */
export function tee<T>(
	iterable: Iterable<T>,
	count = 2,
): IterableIterator<T>[] {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("tee count must be a non-negative integer");
	}

	const iterator = iterable[Symbol.iterator]();
	const buffer: T[] = [];
	const cursors = Array.from<number>({ length: count }).fill(0);
	let bufferStart = 0;
	let exhausted = false;

	function* branch(id: number): IterableIterator<T> {
		while (true) {
			const wanted = cursors[id]!;

			if (wanted === bufferStart + buffer.length) {
				if (exhausted) {
					return;
				}

				const result = iterator.next();

				if (result.done === true) {
					exhausted = true;
					return;
				}

				buffer.push(result.value);
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
