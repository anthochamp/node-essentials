import { clamp } from "@ac-kit/core";

/**
 * How many elements a `splice` would add, net of what it deletes — negative
 * when it shrinks the list.
 *
 * The bounded and blocking list wrappers have to know this _before_ delegating,
 * and `deleteCount` reaches them unclamped, so the clamping the inner list does
 * has to be repeated here. An out-of-range `start` returns `0`: the inner call
 * is about to throw `ListIndexOutOfBoundsError`, and reporting a capacity
 * problem first would be the wrong error.
 */
export function spliceGrowth(
	count: number,
	start: number,
	deleteCount: number,
	itemCount: number,
): number {
	const normalizedStart = start < 0 ? count + start : start;

	if (normalizedStart < 0 || normalizedStart > count) {
		return 0;
	}

	return itemCount - clamp(deleteCount, 0, count - normalizedStart);
}

/** Whether a `set` at this index appends rather than overwrites. */
export function setAppends(count: number, index: number): boolean {
	return (index < 0 ? count + index : index) === count;
}
