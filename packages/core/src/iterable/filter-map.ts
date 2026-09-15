import type { Callable } from "../types/callable.js";
import type { DefinedValue } from "../types/defined-value.js";

/**
 * Maps and filters in one pass: yields every mapped value except the ones the
 * mapper declines to produce.
 *
 * `undefined` is the decline signal, and the result type cannot include it, so
 * "no value here" is never confused with "the value is `undefined`". That is
 * what makes this different from `.map(…).filter(…)`, which cannot tell the two
 * apart and walks the sequence twice.
 *
 * Time complexity: O(1) per element, plus whatever `mapper` costs.
 *
 * @param iterable The input iterable.
 * @param mapper Receives each element and its zero-based index. Returns the
 *   mapped value, or `undefined` to drop the element.
 * @returns An iterator over the produced values.
 */
export function* filterMap<T, R extends DefinedValue>(
	iterable: Iterable<T>,
	mapper: Callable<[T, number], R | undefined>,
): IterableIterator<R> {
	let index = 0;

	for (const item of iterable) {
		const mapped = mapper(item, index++);

		if (mapped !== undefined) {
			yield mapped;
		}
	}
}
