/**
 * Half-open binary search over an abstract index range `[low, high)`,
 * converging on the leftmost index where `goRight` is false — driven by a
 * per-index predicate instead of a concrete array, so a caller can search any
 * indexable structure (`bisectLeft`/`bisectRight`'s array, or
 * `isInSortedIntervals`'s flat, stride-2 range array) without materializing one
 * element per searched item.
 *
 * @param goRight - `true` if the answer lies strictly to the right of `index`.
 * @returns The leftmost index in `[low, high]` where `goRight` is false.
 */
export function binarySearch(
	low: number,
	high: number,
	goRight: (index: number) => boolean,
): number {
	while (low < high) {
		const mid = (low + high) >>> 1;

		if (goRight(mid)) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	return low;
}
