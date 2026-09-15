import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { words } from "@ac-bench/util";
import { VpTree } from "@ac-kit/data";
import { VPTree as MnemonistVpTree } from "mnemonist";

const POINTS = 3_000;
const QUERIES = 200;
const NEIGHBOURS = 5;

const ITEMS = Array.from(new Set(words(POINTS)));
const PROBES = ITEMS.slice(0, QUERIES);

/**
 * Levenshtein distance — a true metric, which is what makes VP-tree pruning
 * valid. Written out rather than imported so both contenders measure the same
 * function and neither is flattered by a faster one.
 */
function levenshtein(a: string, b: string): number {
	const previous = new Array<number>(b.length + 1);
	const current = new Array<number>(b.length + 1);

	for (let index = 0; index <= b.length; index++) previous[index] = index;

	for (let rowIndex = 1; rowIndex <= a.length; rowIndex++) {
		current[0] = rowIndex;

		for (let columnIndex = 1; columnIndex <= b.length; columnIndex++) {
			const cost = a[rowIndex - 1] === b[columnIndex - 1] ? 0 : 1;
			current[columnIndex] = Math.min(
				current[columnIndex - 1]! + 1,
				previous[columnIndex]! + 1,
				previous[columnIndex - 1]! + cost,
			);
		}

		previous.splice(0, previous.length, ...current);
	}

	return previous[b.length]!;
}

/**
 * What a linear scan would answer, as the distances alone (ties make the item
 * set ambiguous).
 */
const WANTED_DISTANCES = PROBES.map((probe) =>
	ITEMS.map((item) => levenshtein(probe, item))
		.sort((left, right) => left - right)
		.slice(0, NEIGHBOURS)
		.join(","),
);

durationCondition(
	`Metric nearest-neighbour — ${QUERIES} ${NEIGHBOURS}-NN queries over ${ITEMS.length} strings under edit distance`,
	() => {
		durationCase(
			"@ac-kit/data VpTree",
			{ tags: { kind: "js", backing: "vantage-point tree" } },
			() => {
				const tree = new VpTree<string>(ITEMS, { distance: levenshtein });

				for (let index = 0; index < PROBES.length; index++) {
					const found = Array.from(
						tree.nearest(PROBES[index]!, NEIGHBOURS),
						([, distance]) => distance,
					).join(",");

					assert.strictEqual(found, WANTED_DISTANCES[index]);
				}
			},
		);
		durationCase(
			"mnemonist VPTree (npm)",
			{ tags: { kind: "js", backing: "vantage-point tree" } },
			() => {
				const tree = MnemonistVpTree.from(ITEMS, levenshtein);

				for (let index = 0; index < PROBES.length; index++) {
					const found = tree
						.nearestNeighbors(NEIGHBOURS, PROBES[index]!)
						.map((match) => match.distance)
						.sort((left, right) => left - right)
						.join(",");

					assert.strictEqual(found, WANTED_DISTANCES[index]);
				}
			},
		);
		durationCase(
			"linear scan",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				// No index at all. The tree has to beat this to justify its existence,
				// and on a high-dimensional metric it often does not.
				for (let index = 0; index < PROBES.length; index++) {
					const probe = PROBES[index]!;
					const distances = new Array<number>(ITEMS.length);

					for (let item = 0; item < ITEMS.length; item++) {
						distances[item] = levenshtein(probe, ITEMS[item]!);
					}

					const found = distances
						.sort((left, right) => left - right)
						.slice(0, NEIGHBOURS)
						.join(",");

					assert.strictEqual(found, WANTED_DISTANCES[index]);
				}
			},
		);
	},
);
