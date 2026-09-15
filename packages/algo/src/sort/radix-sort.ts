import type { Callable } from "@ac-kit/core";

const RADIX_BITS = 8;
const RADIX = 1 << RADIX_BITS;

/**
 * Sorts `items` ascending by a non-negative integer key, stable — LSD radix
 * sort, O(n · k) for k the number of 8-bit digits the largest key needs. Never
 * calls a comparator, so it beats comparison sorts by a wide margin on large
 * collections of integer-keyed items (raw numbers, coordinates, counts).
 *
 * @param items The items to sort. Not modified; a new array is returned.
 * @param valueOf Extracts the non-negative integer sort key from an item.
 * @returns A new array of `items` sorted ascending by `valueOf`.
 * @throws {RangeError} If any key is negative or not a safe integer.
 */
export function radixSort<T>(
	items: readonly T[],
	valueOf: Callable<[T], number>,
): T[] {
	if (items.length <= 1) {
		return items.slice();
	}

	const keys = Array.from<number>({ length: items.length });
	let maxKey = 0;
	for (let index = 0; index < items.length; index++) {
		const key = valueOf(items[index]!);
		if (!Number.isSafeInteger(key) || key < 0) {
			throw new RangeError("radixSort keys must be non-negative safe integers");
		}
		keys[index] = key;
		if (key > maxKey) {
			maxKey = key;
		}
	}

	let source = items.slice();
	let sourceKeys: number[] = keys;

	// One counting-sort pass per base-256 digit, least significant first.
	// `divisor` is always a power of two, so dividing a safe integer by it
	// stays exact in floating point regardless of magnitude.
	for (let divisor = 1; Math.floor(maxKey / divisor) > 0; divisor *= RADIX) {
		const counts = new Uint32Array(RADIX + 1);

		for (let index = 0; index < sourceKeys.length; index++) {
			const digit = Math.floor(sourceKeys[index]! / divisor) % RADIX;
			counts[digit + 1]!++;
		}
		for (let digit = 0; digit < RADIX; digit++) {
			counts[digit + 1]! += counts[digit]!;
		}

		const destination = Array.from<T>({ length: source.length });
		const destinationKeys = Array.from<number>({ length: source.length });
		for (let index = 0; index < source.length; index++) {
			const key = sourceKeys[index]!;
			const digit = Math.floor(key / divisor) % RADIX;
			const position = counts[digit]!++;
			destination[position] = source[index]!;
			destinationKeys[position] = key;
		}

		source = destination;
		sourceKeys = destinationKeys;
	}

	return source;
}
