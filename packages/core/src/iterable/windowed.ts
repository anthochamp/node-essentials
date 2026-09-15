/**
 * Yields every overlapping window of `size` consecutive elements.
 *
 * Not `chunk`: windows overlap, chunks do not. `windowed([1, 2, 3], 2)` yields
 * `[1, 2]` then `[2, 3]`, where `chunk([1, 2, 3], 2)` yields `[1, 2]` then
 * `[3]`. Passing `step` equal to `size` makes the two agree, except that a
 * short trailing group is never yielded here.
 *
 * An input shorter than `size` yields nothing, and so does the tail left over
 * when the length is not reached again — a window is only ever yielded at full
 * width.
 *
 * Time complexity: O(n), allocating one array per window.
 *
 * @param iterable The input iterable.
 * @param size How many elements per window. Must be a positive integer.
 * @param step How far to advance between windows. Must be a positive integer; a
 *   value above `size` skips elements entirely.
 * @returns An iterator over the windows.
 * @throws {RangeError} If `size` or `step` is not a positive integer.
 */
export function* windowed<T>(
	iterable: Iterable<T>,
	size: number,
	step = 1,
): IterableIterator<T[]> {
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError("windowed size must be a positive integer");
	}
	if (!Number.isInteger(step) || step < 1) {
		throw new RangeError("windowed step must be a positive integer");
	}

	const buffer: T[] = [];
	let skip = 0;

	for (const item of iterable) {
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
