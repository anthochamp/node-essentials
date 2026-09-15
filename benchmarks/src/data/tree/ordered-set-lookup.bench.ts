import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { randomInts } from "@ac-bench/util";
import { AvlTree, BinarySearchTree } from "@ac-kit/data";
import { Tree as AvlNpm } from "avl";

import { BTree } from "./__fixtures__/npm-trees.js";

const SIZE = 20_000;
const LOOKUPS = 20_000;

// Shuffled, so the unbalanced `BinarySearchTree` is not handed its worst case;
// the sorted-input case is covered by `sorted-set-sorted-insert.bench.ts`.
const KEYS = randomInts(SIZE, SIZE * 10);
const QUERIES = randomInts(LOOKUPS, SIZE * 10, 0x1234_5678);

const reference = new Set(KEYS);
const WANTED_HITS = QUERIES.reduce(
	(total, query) => total + (reference.has(query) ? 1 : 0),
	0,
);

durationCondition(
	`Ordered set — ${LOOKUPS} membership tests over ${SIZE} shuffled keys`,
	() => {
		durationCase(
			"@ac-kit/data AvlTree",
			{ tags: { kind: "js", backing: "avl tree" } },
			() => {
				const tree = new AvlTree<number>(KEYS);
				let hits = 0;

				for (let index = 0; index < QUERIES.length; index++) {
					if (tree.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"@ac-kit/data BinarySearchTree",
			{ tags: { kind: "js", backing: "unbalanced bst" } },
			() => {
				const tree = new BinarySearchTree<number>(KEYS);
				let hits = 0;

				for (let index = 0; index < QUERIES.length; index++) {
					if (tree.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"avl (npm)",
			{ tags: { kind: "js", backing: "avl tree" } },
			() => {
				const tree = new AvlNpm<number, undefined>();
				for (let index = 0; index < KEYS.length; index++) {
					tree.insert(KEYS[index]!);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (tree.contains(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"sorted-btree (npm)",
			{ tags: { kind: "js", backing: "b+ tree" } },
			() => {
				const tree = new BTree();
				for (let index = 0; index < KEYS.length; index++) {
					tree.set(KEYS[index]!, true);
				}

				let hits = 0;
				for (let index = 0; index < QUERIES.length; index++) {
					if (tree.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"Set (unordered, for scale)",
			{ tags: { kind: "js", backing: "hash" } },
			() => {
				// Not an ordered set: it cannot answer `floor`/`ceiling`/`range` at
				// all. It is here to show what the ordering costs against a hash.
				const set = new Set<number>(KEYS);
				let hits = 0;

				for (let index = 0; index < QUERIES.length; index++) {
					if (set.has(QUERIES[index]!)) hits++;
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
		durationCase(
			"sorted array + binary search",
			{ tags: { kind: "js", backing: "array" } },
			() => {
				// The hand-rolled alternative: sort once, bisect per query. Beats every
				// tree on lookup and loses badly on insertion, which is why the trees
				// exist.
				const sorted = Array.from(new Set(KEYS)).sort((a, b) => a - b);
				let hits = 0;

				for (let index = 0; index < QUERIES.length; index++) {
					const needle = QUERIES[index]!;
					let low = 0;
					let high = sorted.length - 1;

					while (low <= high) {
						const middle = (low + high) >>> 1;
						const value = sorted[middle]!;

						if (value === needle) {
							hits++;
							break;
						}

						if (value < needle) low = middle + 1;
						else high = middle - 1;
					}
				}

				assert.strictEqual(hits, WANTED_HITS);
			},
		);
	},
);
