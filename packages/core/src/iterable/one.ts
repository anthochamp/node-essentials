import type { DefinedValue } from "../types/defined-value.js";

/**
 * Returns the single element of an iterable, or `undefined` when it is empty,
 * rejecting any larger count.
 *
 * The tolerant half of the pair `only` completes: both reject two or more, and
 * only this one accepts none. `T` cannot itself include `undefined`, so the
 * empty case is never ambiguous.
 *
 * Time complexity: O(1) — at most two elements are pulled, so this is safe on
 * an infinite iterable.
 *
 * @param iterable The iterable to read from.
 * @returns The single element, or `undefined` if there is none.
 * @throws {RangeError} If the iterable holds more than one element.
 */
export function one<T extends DefinedValue>(
	iterable: Iterable<T>,
): T | undefined {
	const iterator = iterable[Symbol.iterator]();
	const first = iterator.next();

	if (first.done === true) {
		return undefined;
	}

	if (iterator.next().done !== true) {
		iterator.return?.();

		throw new RangeError("expected at most one item, found more");
	}

	return first.value;
}
