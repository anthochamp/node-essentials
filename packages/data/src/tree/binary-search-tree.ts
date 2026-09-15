import {
	compareNaturalAscending,
	type Comparator,
	type DefinedValue,
} from "@ac-kit/core";

import { ISet } from "../set/iset.js";
import { IBinaryTreeNode, ISearchTree } from "./isearch-tree.js";

/** A node of a {@link BinarySearchTree}. Mutable: the tree owns every field. */
export type BinarySearchTreeNode<T> = {
	value: T;
	left: BinarySearchTreeNode<T> | null;
	right: BinarySearchTreeNode<T> | null;
	parent: BinarySearchTreeNode<T> | null;
};

export type BinarySearchTreeOptions<T> = {
	/**
	 * The ordering. Must be a strict weak ordering and exact — a tolerant
	 * comparison is not transitive, which makes every result below unspecified
	 * rather than merely imprecise.
	 *
	 * Defaults to ascending natural order via `<`, which is correct for numbers,
	 * strings and anything else with a sensible relational operator.
	 */
	comparator?: Comparator<T>;
};

/**
 * An unbalanced binary search tree, ordered by a caller-supplied comparator.
 *
 * Time complexity: O(h) per lookup, insert and delete, where `h` is the tree's
 * height. That is O(log n) only while the insertion order keeps it bushy —
 * inserting already-sorted data degenerates it into a linked list and every
 * operation becomes O(n). **That is the caller's problem to avoid, by choosing
 * `AvlTree` instead**, which pays a little more per insert to guarantee O(log
 * n) worst case. This class exists for the case where the input is known to be
 * unordered and the rebalancing is not worth it.
 *
 * Iteration is in-order, so it is sorted, and is O(n) for the whole traversal.
 *
 * @template T The element type. Anything except `undefined`.
 */
export class BinarySearchTree<
	T extends DefinedValue,
> implements ISearchTree<T> {
	protected root_: BinarySearchTreeNode<T> | null = null;
	private size = 0;

	readonly comparator: Comparator<T>;

	constructor(iterable?: Iterable<T>, options?: BinarySearchTreeOptions<T>) {
		this.comparator = options?.comparator ?? compareNaturalAscending;

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** The root, or `null` when empty. Exposed by `ISearchTree` for traversal. */
	get root(): IBinaryTreeNode<T> | null {
		return this.root_;
	}

	/** In-order, so ascending under the comparator. */
	[Symbol.iterator](): Iterator<T> {
		return this.range();
	}

	count(): number {
		return this.size;
	}

	clear(): void {
		this.root_ = null;
		this.size = 0;
	}

	/** O(h). A value already held is not re-added. */
	add(value: T): void {
		if (this.root_ === null) {
			this.root_ = this.createNode(value, null);
			this.size = 1;
			return;
		}

		let current = this.root_;

		for (;;) {
			const order = this.comparator(value, current.value);

			if (order === 0) {
				return;
			}

			const next = order < 0 ? current.left : current.right;

			if (next === null) {
				const node = this.createNode(value, current);

				if (order < 0) {
					current.left = node;
				} else {
					current.right = node;
				}

				this.size++;
				this.rebalanceFrom(current);

				return;
			}

			current = next;
		}
	}

	/** O(m·h) in the number of values. */
	addAll(values: Iterable<T>): void {
		for (const value of values) {
			this.add(value);
		}
	}

	/** O(h). */
	has(value: T): boolean {
		return this.findNode(value) !== null;
	}

	/** O(h). */
	delete(value: T): boolean {
		const node = this.findNode(value);

		if (node === null) {
			return false;
		}

		this.deleteNode(node);
		this.size--;

		return true;
	}

	/** The smallest element. O(h). */
	min(): T | undefined {
		return this.root_ === null ? undefined : leftmost(this.root_).value;
	}

	/** The largest element. O(h). */
	max(): T | undefined {
		return this.root_ === null ? undefined : rightmost(this.root_).value;
	}

	/** The largest element `<= query`. O(h). */
	floor(query: T): T | undefined {
		let current = this.root_;
		let best: T | undefined;

		while (current !== null) {
			const order = this.comparator(query, current.value);

			if (order === 0) {
				return current.value;
			}

			if (order > 0) {
				best = current.value;
				current = current.right;
			} else {
				current = current.left;
			}
		}

		return best;
	}

	/** The smallest element `>= query`. O(h). */
	ceiling(query: T): T | undefined {
		let current = this.root_;
		let best: T | undefined;

		while (current !== null) {
			const order = this.comparator(query, current.value);

			if (order === 0) {
				return current.value;
			}

			if (order < 0) {
				best = current.value;
				current = current.left;
			} else {
				current = current.right;
			}
		}

		return best;
	}

	/**
	 * Every element in `[from, to)`, ascending. O(h + k) in the number yielded.
	 *
	 * @param from Inclusive lower bound. Unbounded when omitted.
	 * @param to Exclusive upper bound. Unbounded when omitted.
	 */
	*range(from?: T, to?: T): IterableIterator<T> {
		// Iterative: a recursive in-order walk would blow the stack on a
		// degenerate tree, which is precisely this class's failure mode.
		const stack: BinarySearchTreeNode<T>[] = [];
		let current = this.root_;

		while (current !== null || stack.length > 0) {
			while (current !== null) {
				// Anything left of a node already below `from` is below it too.
				if (from !== undefined && this.comparator(current.value, from) < 0) {
					current = current.right;
					continue;
				}

				stack.push(current);
				current = current.left;
			}

			// The `from` pruning above can walk off the end without pushing
			// anything, leaving nothing to pop.
			if (stack.length === 0) {
				return;
			}

			const node = stack.pop() as BinarySearchTreeNode<T>;

			if (to !== undefined && this.comparator(node.value, to) >= 0) {
				return;
			}

			yield node.value;

			current = node.right;
		}
	}

	/** O((n + m) log n). Ascending. */
	union(other: Iterable<T>): ISet<T> {
		const result = this.emptyLike();

		result.addAll(this);
		result.addAll(other);

		return result;
	}

	/** O(m log n). Ascending. */
	intersection(other: Iterable<T>): ISet<T> {
		const result = this.emptyLike();

		for (const value of other) {
			if (this.has(value)) {
				result.add(value);
			}
		}

		return result;
	}

	/** O((n + m) log n). Ascending. */
	difference(other: Iterable<T>): ISet<T> {
		const result = this.emptyLike();

		result.addAll(this);

		for (const value of other) {
			result.delete(value);
		}

		return result;
	}

	/** O((n + m) log n). Ascending. */
	symmetricDifference(other: Iterable<T>): ISet<T> {
		const result = this.emptyLike();

		result.addAll(this);

		for (const value of other) {
			if (this.has(value)) {
				result.delete(value);
			} else {
				result.add(value);
			}
		}

		return result;
	}

	/** O(n log m). */
	isSubsetOf(other: Iterable<T>): boolean {
		const right = this.emptyLike();
		right.addAll(other);

		for (const value of this) {
			if (!right.has(value)) {
				return false;
			}
		}

		return true;
	}

	/** O(m log n). */
	isSupersetOf(other: Iterable<T>): boolean {
		for (const value of other) {
			if (!this.has(value)) {
				return false;
			}
		}

		return true;
	}

	/** O(m log n). */
	isDisjointFrom(other: Iterable<T>): boolean {
		for (const value of other) {
			if (this.has(value)) {
				return false;
			}
		}

		return true;
	}

	/** Overridden by `AvlTree`; an unbalanced tree has nothing to do. */
	protected rebalanceFrom(_from: BinarySearchTreeNode<T> | null): void {}

	protected createNode(
		value: T,
		parent: BinarySearchTreeNode<T> | null,
	): BinarySearchTreeNode<T> {
		return { value, left: null, right: null, parent };
	}

	/** A new tree of this exact kind, carrying this one's comparator. */
	protected emptyLike(): BinarySearchTree<T> {
		return new BinarySearchTree<T>(undefined, { comparator: this.comparator });
	}

	protected replaceChild(
		parent: BinarySearchTreeNode<T> | null,
		child: BinarySearchTreeNode<T>,
		replacement: BinarySearchTreeNode<T> | null,
	): void {
		if (parent === null) {
			this.root_ = replacement;
		} else if (parent.left === child) {
			parent.left = replacement;
		} else {
			parent.right = replacement;
		}

		if (replacement !== null) {
			replacement.parent = parent;
		}
	}

	private findNode(value: T): BinarySearchTreeNode<T> | null {
		let current = this.root_;

		while (current !== null) {
			const order = this.comparator(value, current.value);

			if (order === 0) {
				return current;
			}

			current = order < 0 ? current.left : current.right;
		}

		return null;
	}

	private deleteNode(node: BinarySearchTreeNode<T>): void {
		if (node.left !== null && node.right !== null) {
			// Two children: overwrite with the in-order successor's value, then
			// delete that successor, which has at most one child by construction.
			const successor = leftmost(node.right);

			node.value = successor.value;
			this.deleteNode(successor);

			return;
		}

		const child = node.left ?? node.right;
		const { parent } = node;

		this.replaceChild(parent, node, child);
		this.rebalanceFrom(parent);
	}
}

function leftmost<T>(node: BinarySearchTreeNode<T>): BinarySearchTreeNode<T> {
	let current = node;

	while (current.left !== null) {
		current = current.left;
	}

	return current;
}

function rightmost<T>(node: BinarySearchTreeNode<T>): BinarySearchTreeNode<T> {
	let current = node;

	while (current.right !== null) {
		current = current.right;
	}

	return current;
}
