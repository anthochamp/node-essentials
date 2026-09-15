import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { randomInts } from "@ac-bench/util";
import { AvlTree, BinarySearchTree } from "@ac-kit/data";
import { Tree as AvlNpm } from "avl";

import { BTree } from "./__fixtures__/npm-trees.js";

const SIZE = 20_000;

const SHUFFLED = randomInts(SIZE, SIZE * 10);
const ASCENDING = Array.from({ length: SIZE }, (_, index) => index);

const WANTED_DISTINCT = new Set(SHUFFLED).size;

durationCondition(`Ordered set — insert ${SIZE} shuffled keys`, () => {
	durationCase(
		"@ac-kit/data AvlTree",
		{ tags: { kind: "js", backing: "avl tree" } },
		() => {
			const tree = new AvlTree<number>(SHUFFLED);
			assert.strictEqual(tree.count(), WANTED_DISTINCT);
		},
	);
	durationCase(
		"@ac-kit/data BinarySearchTree",
		{ tags: { kind: "js", backing: "unbalanced bst" } },
		() => {
			const tree = new BinarySearchTree<number>(SHUFFLED);
			assert.strictEqual(tree.count(), WANTED_DISTINCT);
		},
	);
	durationCase(
		"avl (npm)",
		{ tags: { kind: "js", backing: "avl tree" } },
		() => {
			const tree = new AvlNpm<number, undefined>();
			for (let index = 0; index < SHUFFLED.length; index++) {
				if (!tree.contains(SHUFFLED[index]!)) tree.insert(SHUFFLED[index]!);
			}
			assert.strictEqual(tree.size, WANTED_DISTINCT);
		},
	);
	durationCase(
		"sorted-btree (npm)",
		{ tags: { kind: "js", backing: "b+ tree" } },
		() => {
			const tree = new BTree();
			for (let index = 0; index < SHUFFLED.length; index++) {
				tree.set(SHUFFLED[index]!, true);
			}
			assert.strictEqual(tree.size, WANTED_DISTINCT);
		},
	);
	durationCase(
		"Set then sort",
		{ tags: { kind: "js", backing: "array" } },
		() => {
			const sorted = Array.from(new Set(SHUFFLED)).sort((a, b) => a - b);
			assert.strictEqual(sorted.length, WANTED_DISTINCT);
		},
	);
});

durationCondition(
	`Ordered set — insert ${SIZE} already-ascending keys (the degenerate case)`,
	() => {
		durationCase(
			"@ac-kit/data AvlTree",
			{ tags: { kind: "js", backing: "avl tree" } },
			() => {
				const tree = new AvlTree<number>(ASCENDING);
				assert.strictEqual(tree.count(), SIZE);
			},
		);
		durationCase(
			"@ac-kit/data BinarySearchTree",
			{ tags: { kind: "js", backing: "unbalanced bst" } },
			() => {
				// Ascending input degenerates this into a linked list, so every insert
				// walks the whole spine. This row is the reason `AvlTree` exists, and
				// it is expected to be the slowest by orders of magnitude.
				const tree = new BinarySearchTree<number>(ASCENDING);
				assert.strictEqual(tree.count(), SIZE);
			},
		);
		durationCase(
			"avl (npm)",
			{ tags: { kind: "js", backing: "avl tree" } },
			() => {
				const tree = new AvlNpm<number, undefined>();
				for (let index = 0; index < ASCENDING.length; index++) {
					tree.insert(ASCENDING[index]!);
				}
				assert.strictEqual(tree.size, SIZE);
			},
		);
		durationCase(
			"sorted-btree (npm)",
			{ tags: { kind: "js", backing: "b+ tree" } },
			() => {
				const tree = new BTree();
				for (let index = 0; index < ASCENDING.length; index++) {
					tree.set(ASCENDING[index]!, true);
				}
				assert.strictEqual(tree.size, SIZE);
			},
		);
	},
);
