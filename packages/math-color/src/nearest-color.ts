import { labSquaredDistance } from "./models/lab.js";
import { Oklab } from "./spaces/color-spaces.js";

/** Finds the palette entry perceptually closest to a colour. */
export type NearestColorFinder<TEntry> = (target: Oklab) => TEntry;

/** A palette with no entries has no nearest member to return. */
export class EmptyPaletteError extends Error {
	constructor() {
		super("A nearest-colour finder needs at least one entry");
		this.name = "EmptyPaletteError";
	}
}

/**
 * Binds a palette to a nearest-member lookup, converting it once.
 *
 * The conversion belongs to the _registration_, not to the query: a palette is
 * fixed and a lookup is called per pixel or per cell, so converting inside the
 * search makes every call pay for the whole table. Building the finder once and
 * keeping it is the whole point of the shape.
 *
 * O(n) per query in the entry count, with no allocation. A palette large enough
 * for that to hurt wants a spatial index instead, which this deliberately is
 * not.
 *
 * Ordering uses squared distance: monotonic in the distance, so the winner is
 * the same one, without a square root per entry per call.
 *
 * @param entries Read once; later mutation of the source is not observed.
 * @param colorOf Where an entry keeps its colour.
 * @throws {EmptyPaletteError} When `entries` is empty.
 */
export function createNearestColorFinder<TEntry>(
	entries: Iterable<TEntry>,
	colorOf: (entry: TEntry) => Oklab,
): NearestColorFinder<TEntry> {
	const table = Array.from(entries, (entry) => ({
		entry,
		color: colorOf(entry),
	}));
	if (table.length === 0) {
		throw new EmptyPaletteError();
	}

	return (target) => {
		let best = table[0]!;
		let bestDistance = labSquaredDistance(target, best.color);

		for (let index = 1; index < table.length; index++) {
			const candidate = table[index]!;
			const distance = labSquaredDistance(target, candidate.color);
			if (distance < bestDistance) {
				best = candidate;
				bestDistance = distance;
			}
		}

		return best.entry;
	};
}
