import type { Comparator, ComparatorResult } from "./types.js";

/**
 * Lifts `compare` to sequences, comparing element by element and ordering a
 * proper prefix before the sequence that extends it.
 *
 * Consumes both operands lazily and stops at the first difference, so it costs
 * one `compare` call per element only when the two share a full prefix. Both
 * iterators are closed on the way out.
 */
export function createLexicographicalComparator<T>(
	compare: Comparator<T>,
): Comparator<Iterable<T>> {
	return (a, b) => {
		const left = a[Symbol.iterator]();
		const right = b[Symbol.iterator]();
		let result: ComparatorResult;

		for (;;) {
			const x = left.next();
			const y = right.next();

			if (x.done === true) {
				result = y.done === true ? 0 : -1;
				break;
			}
			if (y.done === true) {
				result = 1;
				break;
			}

			result = compare(x.value, y.value);
			if (result !== 0) {
				break;
			}
		}

		left.return?.();
		right.return?.();
		return result;
	};
}
