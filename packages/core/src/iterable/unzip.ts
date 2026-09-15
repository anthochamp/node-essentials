/** One array per tuple position, holding that position's values. */
export type Unzipped<T extends readonly unknown[]> = {
	[K in keyof T]: T[K][];
};

/**
 * Splits an iterable of tuples into one array per tuple position — the inverse
 * of `zip`.
 *
 * Eager, unlike most of this directory: a column cannot be produced without
 * reading every row.
 *
 * Ragged input is tolerated. The result has as many columns as the longest
 * tuple seen, and a tuple shorter than that contributes nothing to the columns
 * it does not reach, so those columns end up shorter rather than padded.
 *
 * Time complexity: O(n × width).
 *
 * @param tuples The tuples to split.
 * @returns The columns. Empty when the input is.
 */
export function unzip<const T extends readonly unknown[]>(
	tuples: Iterable<T>,
): Unzipped<T> {
	const columns: unknown[][] = [];

	for (const tuple of tuples) {
		for (let index = 0; index < tuple.length; index++) {
			(columns[index] ??= []).push(tuple[index]);
		}
	}

	// Safe: one column was appended per tuple position, so the array has exactly
	// the arity and element types `Unzipped<T>` describes.
	return columns as Unzipped<T>;
}
