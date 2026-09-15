import { FastSet } from "@ac-kit/core";

/**
 * Interleaves `special` items into `rest` at evenly-spaced positions.
 *
 * Each special item is placed at the center of an equal-length slot so that
 * special items are spread as uniformly as possible through the combined
 * sequence — the same reasoning as Bresenham's line algorithm, distributing `k`
 * items across `n` positions without accumulating drift.
 *
 * Time complexity: O(n) in the combined length. Both inputs are read in full
 * before the first item is yielded, since the spacing depends on both counts.
 *
 * @param special - Items to distribute evenly.
 * @param rest - Items to fill the gaps.
 * @returns An iterator over the combined sequence.
 */
export function* spreadEvenly<T>(
	special: readonly T[],
	rest: readonly T[],
): IterableIterator<T> {
	if (special.length === 0) {
		yield* rest;
		return;
	}

	const total = special.length + rest.length;
	const slots = new FastSet<number>();

	for (let k = 0; k < special.length; k++) {
		slots.add(Math.floor(((k + 0.5) * total) / special.length));
	}

	let si = 0;
	let ri = 0;

	for (let pos = 0; pos < total; pos++) {
		if (slots.has(pos) && si < special.length) {
			yield special[si++]!;
		} else if (ri < rest.length) {
			yield rest[ri++]!;
		} else {
			yield special[si++]!;
		}
	}
}
