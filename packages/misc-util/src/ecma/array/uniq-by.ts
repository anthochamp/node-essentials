/**
 * Returns a new array with unique items based on a key function.
 *
 * Example:
 * ```ts
 * const array = [
 *  { id: 1, name: "Alice" },
 *  { id: 2, name: "Bob" },
 *  { id: 1, name: "Alice" },
 *  { id: 3, name: "Charlie" },
 *  { id: 2, name: "Bob" },
 * ];
 * const uniqueById = uniqBy(array, (item) => item.id);
 * console.log(uniqueById);
 * // Output: [
 * //   { id: 1, name: "Alice" },
 * //   { id: 2, name: "Bob" },
 * //   { id: 3, name: "Charlie" },
 * // ]
 * ```
 *
 * @param array The input array.
 * @param keyFn A function that takes an item and returns a key.
 * @returns A new array with unique items.
 */
export function uniqBy<T, U>(array: T[], keyFn: (item: T) => U): T[] {
	const seen = new Set<U>();
	return array.filter((item) => {
		const key = keyFn(item);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}
