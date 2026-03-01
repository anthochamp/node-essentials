/**
 * Removes null and undefined values from an array.
 *
 * @param array The array to compact.
 * @returns A new array with null and undefined values removed.
 */
export function compact<T>(array: (T | null | undefined)[]): T[] {
	return array.filter((item): item is T => item !== null && item !== undefined);
}
