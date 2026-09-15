import type { Comparator } from "@ac-kit/core";

/**
 * Rearranges `items` in place until the element at index `k` is the one a full
 * sort by `compare` would have put there, and returns it — Hoare's selection
 * algorithm.
 *
 * O(n) average, O(n²) worst case.
 *
 * @param items Working array, modified in place. `k` must be a valid index.
 * @param k The rank to resolve (0-based).
 * @param compare Total order to select by.
 * @returns The value that belongs at index `k`.
 */
export function quickselect<T>(
	items: T[],
	k: number,
	compare: Comparator<T>,
): T {
	let left = 0;
	let right = items.length - 1;

	while (left < right) {
		const pivot = items[(left + right) >> 1]!;
		let lower = left;
		let upper = right;

		while (lower <= upper) {
			while (compare(items[lower]!, pivot) < 0) {
				lower++;
			}
			while (compare(items[upper]!, pivot) > 0) {
				upper--;
			}
			if (lower <= upper) {
				const swap = items[lower]!;
				items[lower] = items[upper]!;
				items[upper] = swap;
				lower++;
				upper--;
			}
		}

		if (k <= upper) {
			right = upper;
		} else if (k >= lower) {
			left = lower;
		} else {
			break;
		}
	}

	return items[k]!;
}
