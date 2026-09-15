/**
 * Returns elements of `array` at the given `indices`.
 *
 * Equivalent to lodash's `_.at`. All indices must be valid.
 *
 * @param array - The source array.
 * @param indices - Positions to select.
 * @returns A new array of elements at those positions.
 */
export function selectAt<T>(
	array: readonly T[],
	indices: readonly number[],
): T[] {
	return indices.map((i) => array[i]!);
}
