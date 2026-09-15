import type { MaybeAsyncCallable } from "../../types/callable.js";
import type { DefinedValue } from "../../types/defined-value.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Maps and filters in one pass: yields every mapped value except the ones the
 * mapper declines to produce.
 *
 * The async counterpart of `filterMap`. `undefined` is the decline signal, and
 * the result type cannot include it, so "no value here" is never confused with
 * "the value is `undefined`".
 *
 * Time complexity: O(1) per element, plus whatever `mapper` costs.
 *
 * @param iterable The input iterable, sync or async.
 * @param mapper Receives each element and its zero-based index. Resolves to the
 *   mapped value, or `undefined` to drop the element.
 * @returns An iterator over the produced values.
 */
export async function* filterMapAsync<T, R extends DefinedValue>(
	iterable: MaybeAsyncIterable<T>,
	mapper: MaybeAsyncCallable<[T, number], R | undefined>,
): AsyncIterableIterator<R> {
	let index = 0;

	for await (const item of iterable) {
		const mapped = await mapper(item, index++);

		if (mapped !== undefined) {
			yield mapped;
		}
	}
}
