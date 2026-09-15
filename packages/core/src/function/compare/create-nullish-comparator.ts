import type { Comparator } from "./types.js";

/**
 * Widens `compare` to accept `null` and `undefined`, ordering both before every
 * other value and treating them as equivalent to each other.
 */
export function createNullishFirstComparator<T>(
	compare: Comparator<T>,
): Comparator<T | null | undefined> {
	return (a, b) => {
		if (a === null || a === undefined) {
			return b === null || b === undefined ? 0 : -1;
		}
		if (b === null || b === undefined) {
			return 1;
		}
		return compare(a, b);
	};
}

/**
 * Widens `compare` to accept `null` and `undefined`, ordering both after every
 * other value and treating them as equivalent to each other.
 */
export function createNullishLastComparator<T>(
	compare: Comparator<T>,
): Comparator<T | null | undefined> {
	return (a, b) => {
		if (a === null || a === undefined) {
			return b === null || b === undefined ? 0 : 1;
		}
		if (b === null || b === undefined) {
			return -1;
		}
		return compare(a, b);
	};
}
