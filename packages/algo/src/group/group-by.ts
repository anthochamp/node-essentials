import {
	UnimplementedError,
	type Callable,
	type EqualityComparisonStrategy,
} from "@ac-kit/core";

/**
 * A nesting of {@link groupBy}'s result, one `Map` level per key accessor.
 * `Depth` counts the accessors still to be applied.
 */
export type GroupedBy<
	T,
	Keys extends readonly unknown[],
> = Keys extends readonly [infer Head, ...infer Tail]
	? Tail extends readonly []
		? Map<Head, T[]>
		: Map<Head, GroupedBy<T, Tail>>
	: never;

/**
 * Groups the items of an iterable by the key returned from each accessor, one
 * nested `Map` level per accessor.
 *
 * Groups are created in the order their keys first occur. Time complexity: O(n
 * · k) for `k` accessors, O(n) additional space, under the default
 * `"sameValueZero"`.
 *
 * `keysOf` is an array rather than a rest parameter because a trailing
 * `comparisonStrategy` is itself allowed to be a function, so it could not be
 * told apart from one more accessor.
 *
 * @param iterable The input iterable.
 * @param keysOf One or more functions taking an item and returning a group key,
 *   outermost level first.
 * @param comparisonStrategy How keys are compared. Only `"sameValueZero"` is
 *   supported, because grouping is backed by a `Map`, whose key equality is
 *   fixed; any other strategy would need a different backing structure and a
 *   different complexity.
 * @returns Nested maps from each group key to the items in that group.
 * @throws {UnimplementedError} If `comparisonStrategy` is not
 *   `"sameValueZero"`.
 */
export function groupBy<T, const Keys extends readonly [unknown, ...unknown[]]>(
	iterable: Iterable<T>,
	keysOf: { [I in keyof Keys]: Callable<[T], Keys[I]> },
	comparisonStrategy: EqualityComparisonStrategy<
		Keys[number],
		Keys[number]
	> = "sameValueZero",
): GroupedBy<T, Keys> {
	if (comparisonStrategy !== "sameValueZero") {
		throw new UnimplementedError(
			`comparison strategy: ${comparisonStrategy.toString()}`,
		);
	}

	const [first, ...rest] = keysOf;

	// Single-accessor fast path: no recursion, no intermediate grouping.
	const groups = new Map<unknown, T[]>();

	for (const item of iterable) {
		const key = first(item);
		const group = groups.get(key);

		if (group === undefined) {
			groups.set(key, [item]);
		} else {
			group.push(item);
		}
	}

	if (rest.length === 0) {
		return groups as GroupedBy<T, Keys>;
	}

	const nested = new Map<unknown, unknown>();
	for (const [key, items] of groups) {
		nested.set(key, groupBy(items, rest as [Callable<[T], unknown>]));
	}

	return nested as GroupedBy<T, Keys>;
}
