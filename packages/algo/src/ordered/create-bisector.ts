import { type Callable, compareNaturalAscending } from "@ac-kit/core";

import { bisectCenter } from "./bisect-center.js";
import { bisectLeft } from "./bisect-left.js";
import { bisectRight } from "./bisect-right.js";

/**
 * A `{left, right}` pair bound to one accessor, from {@link createBisector},
 * gaining `center` when the accessor's key is numeric.
 */
export type Bisector<T, V> = {
	left(items: readonly T[], value: V): number;
	right(items: readonly T[], value: V): number;
} & (V extends number
	? { center(items: readonly T[], value: number): number }
	: object);

/**
 * Builds a {@link Bisector} that locates `value` among `items` by comparing
 * `valueOf(item)` instead of `item` itself, in ascending natural order
 * (`<`/`>`) — so `items` can be sorted by any derived key, not just `T`'s own
 * order.
 *
 * `valueOf` is called once per comparison during each search, not once per item
 * up front — binary search stays O(log n), it never materialises a mapped
 * array.
 *
 * `center` is exposed only for a numeric key, since "nearest" needs a distance
 * and no distance can be derived from an arbitrary ordering.
 *
 * @param valueOf Extracts the sort key from an item.
 * @returns Bound `left` and `right` bisect functions, plus `center` for a
 *   numeric key.
 */
export function createBisector<T, V>(
	valueOf: Callable<[T], V>,
): Bisector<T, V> {
	const compare = (item: T, value: V) =>
		compareNaturalAscending(valueOf(item), value);

	// `center` is present at runtime regardless; the return type is what hides
	// it from callers whose key is not numeric.
	return {
		left: (items: readonly T[], value: V) => bisectLeft(items, value, compare),
		right: (items: readonly T[], value: V) =>
			bisectRight(items, value, compare),
		center: (items: readonly T[], value: number) =>
			bisectCenter(items, value, valueOf as Callable<[T], number>),
	} as Bisector<T, V>;
}
