/**
 * Recursively compute the intersection of element types from multiple arrays.
 */
type IntersectArrayElements<T extends readonly unknown[][]> =
	T extends readonly [
		infer First extends readonly unknown[],
		...infer Rest extends readonly unknown[][],
	]
		? Rest extends readonly []
			? First[number]
			: Extract<First[number], IntersectArrayElements<Rest>>
		: never;

/**
 * Compute the intersection of multiple arrays.
 *
 * @param arrays The arrays to intersect.
 * @returns An array containing the elements common to all input arrays.
 */
export function intersection<T extends readonly unknown[][]>(
	...arrays: T
): IntersectArrayElements<T>[] {
	if (arrays.length === 0 || arrays.length === 1) {
		return [];
	}

	const [first, ...rest] = arrays;
	return rest.reduce<unknown[]>(
		(acc, curr) =>
			acc.filter((item) => {
				// Use strict equality check for NaN (NaN !== NaN)
				if (Number.isNaN(item)) {
					return false;
				}
				return curr.includes(item);
			}),
		first as unknown[],
	) as IntersectArrayElements<T>[];
}
