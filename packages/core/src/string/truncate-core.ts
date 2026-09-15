export type TruncateCoreOptions = {
	/**
	 * The text already split into atomic units — UTF-16 code units for
	 * `truncate`, grapheme clusters for `@ac-kit/format-monospace`'s
	 * `truncateToWidth`.
	 */
	atoms: readonly string[];

	/**
	 * Size contributed by one atom (`1` for `truncate`, `visibleWidth` for
	 * `truncateToWidth`).
	 */
	measure: (atom: string) => number;

	ellipsisString: string;
	ellipsisMeasure: number;
	maxMeasure: number;
	position: "start" | "middle" | "end";
	wordCutting: boolean;
	strictLength: boolean;
};

function takeByMeasure(
	atoms: readonly string[],
	maxMeasure: number,
	measure: (atom: string) => number,
	direction: "forward" | "backward",
): string[] {
	let total = 0;
	const taken: string[] = [];

	if (direction === "forward") {
		for (const atom of atoms) {
			const atomMeasure = measure(atom);
			if (total + atomMeasure > maxMeasure) {
				break;
			}

			total += atomMeasure;
			taken.push(atom);
		}
	} else {
		for (let index = atoms.length - 1; index >= 0; index--) {
			const atom = atoms[index]!;
			const atomMeasure = measure(atom);
			if (total + atomMeasure > maxMeasure) {
				break;
			}

			total += atomMeasure;
			taken.unshift(atom);
		}
	}

	return taken;
}

/**
 * Drops a trailing/leading partial word, falling back to `atoms` unchanged if
 * no space is found.
 */
function trimToWordBoundary(
	atoms: readonly string[],
	edge: "trailing" | "leading",
): readonly string[] {
	if (edge === "trailing") {
		const lastSpace = atoms.findLastIndex((atom) => atom === " ");
		return lastSpace === -1 ? atoms : atoms.slice(0, lastSpace);
	}

	const firstSpace = atoms.findIndex((atom) => atom === " ");
	return firstSpace === -1 ? atoms : atoms.slice(firstSpace + 1);
}

/**
 * Shared truncate-with-ellipsis algorithm behind `truncate` (atoms are UTF-16
 * code units) and `@ac-kit/format-monospace`'s `truncateToWidth` (atoms are
 * grapheme clusters) — identical position/word-cutting/ellipsis-budget logic,
 * parameterized only by how one atom's size is measured.
 *
 * Callers only call in once they already know the text doesn't fit `maxMeasure`
 * — the "already fits" short circuit stays with each caller, since only they
 * know how to compare against the original `text` cheaply.
 */
export function truncateCore(options: TruncateCoreOptions): string {
	const { ellipsisString, ellipsisMeasure, maxMeasure, strictLength } = options;

	if (maxMeasure === ellipsisMeasure) {
		return ellipsisString;
	}

	if (maxMeasure < ellipsisMeasure) {
		return strictLength ? "" : ellipsisString;
	}

	const { atoms, measure, position, wordCutting } = options;
	const targetMeasure = maxMeasure - ellipsisMeasure;

	switch (position) {
		case "end": {
			const taken = takeByMeasure(atoms, targetMeasure, measure, "forward");
			const kept = wordCutting ? taken : trimToWordBoundary(taken, "trailing");
			return kept.join("") + ellipsisString;
		}

		case "start": {
			const taken = takeByMeasure(atoms, targetMeasure, measure, "backward");
			const kept = wordCutting ? taken : trimToWordBoundary(taken, "leading");
			return ellipsisString + kept.join("");
		}

		case "middle": {
			const leftMeasure = Math.ceil(targetMeasure / 2);
			const rightMeasure = Math.floor(targetMeasure / 2);

			const leftTaken = takeByMeasure(atoms, leftMeasure, measure, "forward");
			const rightTaken = takeByMeasure(
				atoms,
				rightMeasure,
				measure,
				"backward",
			);

			const left = wordCutting
				? leftTaken
				: trimToWordBoundary(leftTaken, "trailing");
			const right = wordCutting
				? rightTaken
				: trimToWordBoundary(rightTaken, "leading");

			return left.join("") + ellipsisString + right.join("");
		}
	}
}
