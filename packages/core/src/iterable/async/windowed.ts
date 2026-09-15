import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields every overlapping window of `size` consecutive elements.
 *
 * The async counterpart of `windowed`. Not `chunkAsync`: windows overlap,
 * chunks do not, and a short trailing window is never yielded.
 *
 * Time complexity: O(n), allocating one array per window.
 *
 * @param iterable The input iterable, sync or async.
 * @param size How many elements per window. Must be a positive integer.
 * @param step How far to advance between windows. Must be a positive integer.
 * @returns An iterator over the windows.
 * @throws {RangeError} If `size` or `step` is not a positive integer.
 */
export async function* windowedAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	size: number,
	step = 1,
): AsyncIterableIterator<T[]> {
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError("windowedAsync size must be a positive integer");
	}
	if (!Number.isInteger(step) || step < 1) {
		throw new RangeError("windowedAsync step must be a positive integer");
	}

	const buffer: T[] = [];
	let skip = 0;

	for await (const item of iterable) {
		if (skip > 0) {
			skip--;
			continue;
		}

		buffer.push(item);

		if (buffer.length === size) {
			yield [...buffer];

			if (step >= size) {
				buffer.length = 0;
				skip = step - size;
			} else {
				buffer.splice(0, step);
			}
		}
	}
}
