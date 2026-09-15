import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { AvlTree } from "./avl-tree.js";
import { BinarySearchTree } from "./binary-search-tree.js";

suite.each<{
	description: string;
	factory: Callable<[iterable?: Iterable<number>], BinarySearchTree<number>>;
}>([
	{
		description: "BinarySearchTree",
		factory: (iterable) => new BinarySearchTree(iterable),
	},
	{
		description: "AvlTree",
		factory: (iterable) => new AvlTree(iterable),
	},
])("$description", ({ factory }) => {
	test("should iterate in ascending order regardless of insertion order", () => {
		const tree = factory([5, 3, 8, 1, 9, 7]);

		expect(Array.from(tree)).toEqual([1, 3, 5, 7, 8, 9]);
		expect(tree.count()).toBe(6);
	});

	test("should ignore a value it already holds", () => {
		const tree = factory([1, 2]);

		tree.add(1);

		expect(tree.count()).toBe(2);
		expect(Array.from(tree)).toEqual([1, 2]);
	});

	test("should answer membership", () => {
		const tree = factory([5, 3, 8]);

		expect(tree.has(3)).toBe(true);
		expect(tree.has(4)).toBe(false);
	});

	test("should be empty before anything is added", () => {
		const tree = factory();

		expect(tree.count()).toBe(0);
		expect(tree.root).toBeNull();
		expect(tree.min()).toBeUndefined();
		expect(tree.max()).toBeUndefined();
		expect(Array.from(tree)).toEqual([]);
	});

	test("should expose min and max", () => {
		const tree = factory([5, 3, 8, 1, 9]);

		expect(tree.min()).toBe(1);
		expect(tree.max()).toBe(9);
	});

	test("should delete a leaf, a one-child node and a two-child node", () => {
		const tree = factory([5, 3, 8, 1, 4, 7, 9]);

		expect(tree.delete(1)).toBe(true);
		expect(Array.from(tree)).toEqual([3, 4, 5, 7, 8, 9]);

		expect(tree.delete(3)).toBe(true);
		expect(Array.from(tree)).toEqual([4, 5, 7, 8, 9]);

		expect(tree.delete(8)).toBe(true);
		expect(Array.from(tree)).toEqual([4, 5, 7, 9]);

		expect(tree.count()).toBe(4);
	});

	test("should delete the root", () => {
		const tree = factory([5, 3, 8]);

		expect(tree.delete(5)).toBe(true);

		expect(Array.from(tree)).toEqual([3, 8]);
		expect(tree.count()).toBe(2);
	});

	test("should empty out one delete at a time", () => {
		const tree = factory([5, 3, 8, 1, 4, 7, 9]);

		for (const value of [5, 3, 8, 1, 4, 7, 9]) {
			expect(tree.delete(value)).toBe(true);
		}

		expect(tree.count()).toBe(0);
		expect(tree.root).toBeNull();
		expect(Array.from(tree)).toEqual([]);
	});

	test("should report a delete that matched nothing", () => {
		const tree = factory([1]);

		expect(tree.delete(99)).toBe(false);
		expect(tree.count()).toBe(1);
	});

	test("should answer floor and ceiling", () => {
		const tree = factory([10, 20, 30]);

		expect(tree.floor(20)).toBe(20);
		expect(tree.floor(25)).toBe(20);
		expect(tree.floor(5)).toBeUndefined();
		expect(tree.floor(35)).toBe(30);

		expect(tree.ceiling(20)).toBe(20);
		expect(tree.ceiling(25)).toBe(30);
		expect(tree.ceiling(35)).toBeUndefined();
		expect(tree.ceiling(5)).toBe(10);
	});

	test("should yield a half-open range", () => {
		const tree = factory([1, 2, 3, 4, 5, 6]);

		expect(Array.from(tree.range(2, 5))).toEqual([2, 3, 4]);
		expect(Array.from(tree.range(undefined, 3))).toEqual([1, 2]);
		expect(Array.from(tree.range(4))).toEqual([4, 5, 6]);
		expect(Array.from(tree.range())).toEqual([1, 2, 3, 4, 5, 6]);
		expect(Array.from(tree.range(10, 20))).toEqual([]);
		expect(Array.from(tree.range(5, 2))).toEqual([]);
	});

	test("should honour a caller-supplied comparator", () => {
		const descending = new BinarySearchTree<number>([1, 2, 3], {
			comparator: (a, b) => (a > b ? -1 : a < b ? 1 : 0),
		});

		expect(Array.from(descending)).toEqual([3, 2, 1]);
		expect(descending.min()).toBe(3);
		expect(descending.max()).toBe(1);
	});

	test("should clear every element", () => {
		const tree = factory([1, 2, 3]);

		tree.clear();

		expect(tree.count()).toBe(0);
		expect(tree.root).toBeNull();
	});

	suite("set algebra", () => {
		test("should return ascending results", () => {
			const tree = factory([1, 2, 3]);

			expect(Array.from(tree.union([5, 4]))).toEqual([1, 2, 3, 4, 5]);
			expect(Array.from(tree.intersection([3, 2, 9]))).toEqual([2, 3]);
			expect(Array.from(tree.difference([2]))).toEqual([1, 3]);
			expect(Array.from(tree.symmetricDifference([3, 4]))).toEqual([1, 2, 4]);
		});

		test("should answer the containment predicates", () => {
			const tree = factory([1, 2, 3]);

			expect(tree.isSubsetOf([1, 2, 3, 4])).toBe(true);
			expect(tree.isSubsetOf([1, 2])).toBe(false);
			expect(tree.isSupersetOf([1, 2])).toBe(true);
			expect(tree.isSupersetOf([9])).toBe(false);
			expect(tree.isDisjointFrom([9])).toBe(true);
			expect(tree.isDisjointFrom([1])).toBe(false);
		});

		test("should not mutate the operand", () => {
			const tree = factory([1, 2, 3]);

			tree.union([9]);
			tree.difference([1]);

			expect(Array.from(tree)).toEqual([1, 2, 3]);
		});
	});

	test("should survive a large randomised insert/delete workload", () => {
		const tree = factory();
		const mirror = new Set<number>();

		// Deterministic LCG: a failure has to be reproducible.
		let seed = 12_345;
		const next = (): number => {
			seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
			return seed;
		};

		for (let round = 0; round < 4000; round++) {
			const value = next() % 500;

			if (next() % 3 === 0) {
				expect(tree.delete(value)).toBe(mirror.delete(value));
			} else {
				tree.add(value);
				mirror.add(value);
			}
		}

		expect(tree.count()).toBe(mirror.size);
		expect(Array.from(tree)).toEqual(Array.from(mirror).sort((a, b) => a - b));
	});
});

suite("AvlTree balancing", () => {
	const SIZE = 2000;
	const ascending = Array.from({ length: SIZE }, (_, index) => index);

	test("should stay logarithmic on sorted input, which degenerates a plain BST", () => {
		const avl = new AvlTree<number>(ascending);

		// The AVL bound is ~1.44 log2(n + 2) - 0.33.
		const bound = 1.44 * Math.log2(SIZE + 2);

		expect(avl.height()).toBeLessThanOrEqual(bound);
		expect(avl.count()).toBe(SIZE);
		expect(Array.from(avl)).toEqual(ascending);
	});

	test("should stay logarithmic on descending input too", () => {
		const avl = new AvlTree<number>(ascending.toReversed());

		expect(avl.height()).toBeLessThanOrEqual(1.44 * Math.log2(SIZE + 2));
		expect(Array.from(avl)).toEqual(ascending);
	});

	test("should stay balanced after deletions", () => {
		const avl = new AvlTree<number>(ascending);

		for (let value = 0; value < SIZE / 2; value++) {
			avl.delete(value);
		}

		expect(avl.count()).toBe(SIZE / 2);
		expect(avl.height()).toBeLessThanOrEqual(1.44 * Math.log2(SIZE / 2 + 2));
		expect(Array.from(avl)).toEqual(ascending.slice(SIZE / 2));
	});

	test("should keep every node's balance factor within one", () => {
		const avl = new AvlTree<number>(ascending);

		const heightOf = (node: unknown): number =>
			node === null ? 0 : (node as { height: number }).height;

		const check = (node: unknown): void => {
			if (node === null) {
				return;
			}

			const typed = node as {
				left: unknown;
				right: unknown;
				height: number;
			};

			const balance = heightOf(typed.left) - heightOf(typed.right);

			expect(Math.abs(balance)).toBeLessThanOrEqual(1);
			expect(typed.height).toBe(
				1 + Math.max(heightOf(typed.left), heightOf(typed.right)),
			);

			check(typed.left);
			check(typed.right);
		};

		check(avl.root);
	});

	test("should keep parent links consistent after rotations", () => {
		const avl = new AvlTree<number>(ascending);

		const check = (node: unknown): void => {
			if (node === null) {
				return;
			}

			const typed = node as {
				left: { parent: unknown } | null;
				right: { parent: unknown } | null;
			};

			if (typed.left !== null) {
				expect(typed.left.parent).toBe(node);
				check(typed.left);
			}
			if (typed.right !== null) {
				expect(typed.right.parent).toBe(node);
				check(typed.right);
			}
		};

		expect(avl.root?.parent).toBeNull();
		check(avl.root);
	});

	test("should keep derived sets balanced too", () => {
		const avl = new AvlTree<number>(ascending);

		const united = avl.union([SIZE + 1]) as AvlTree<number>;

		expect(united).toBeInstanceOf(AvlTree);
		expect(united.height()).toBeLessThanOrEqual(1.44 * Math.log2(SIZE + 3));
	});
});
