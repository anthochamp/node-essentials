import type { MaybeAsyncIterable } from "../../types/iterator.js";
import type { Unzipped } from "../unzip.js";

/**
 * Splits an iterable of tuples into one array per tuple position — the inverse
 * of `zipAsync`.
 *
 * The async counterpart of `unzip`, and eager for the same reason: a column
 * cannot be produced without reading every row.
 *
 * Time complexity: O(n × width).
 *
 * @param tuples The tuples to split, sync or async.
 * @param signal Aborts the read.
 * @returns The columns. Empty when the input is.
 */
export async function unzipAsync<const T extends readonly unknown[]>(
	tuples: MaybeAsyncIterable<T>,
	signal?: AbortSignal,
): Promise<Unzipped<T>> {
	signal?.throwIfAborted();

	const columns: unknown[][] = [];

	for await (const tuple of tuples) {
		signal?.throwIfAborted();

		for (let index = 0; index < tuple.length; index++) {
			(columns[index] ??= []).push(tuple[index]);
		}
	}

	// Safe: one column was appended per tuple position, so the array has exactly
	// the arity and element types `Unzipped<T>` describes.
	return columns as Unzipped<T>;
}
