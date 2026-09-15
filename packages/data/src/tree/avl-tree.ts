import type { DefinedValue } from "@ac-kit/core";

import {
	BinarySearchTree,
	type BinarySearchTreeNode,
	type BinarySearchTreeOptions,
} from "./binary-search-tree.js";

/**
 * A {@link BinarySearchTree} node augmented with the height AVL rebalancing
 * needs.
 */
export type AvlTreeNode<T> = BinarySearchTreeNode<T> & { height: number };

export type AvlTreeOptions<T> = BinarySearchTreeOptions<T>;

const heightOf = <T>(node: BinarySearchTreeNode<T> | null): number =>
	node === null ? 0 : (node as AvlTreeNode<T>).height;

/**
 * A self-balancing binary search tree: a {@link BinarySearchTree} that keeps
 * every node's two subtrees within one level of each other.
 *
 * That invariant bounds the height at ~1.44 log₂(n), so **every** operation is
 * O(log n) in the worst case — including the sorted-input case that degenerates
 * a plain `BinarySearchTree` into a linked list. The price is a height field
 * per node and up to O(log n) rotations per insert or delete. Prefer this
 * unless the input is known to arrive unordered.
 *
 * AVL keeps a tighter height bound than a red-black tree, so lookups are
 * slightly faster and mutations slightly slower; pick on which dominates.
 *
 * @template T The element type. Anything except `undefined`.
 */
export class AvlTree<T extends DefinedValue> extends BinarySearchTree<T> {
	constructor(iterable?: Iterable<T>, options?: AvlTreeOptions<T>) {
		super(undefined, options);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** The longest root-to-leaf path, in nodes. `0` when empty. O(1). */
	height(): number {
		return heightOf(this.root_);
	}

	protected override createNode(
		value: T,
		parent: BinarySearchTreeNode<T> | null,
	): AvlTreeNode<T> {
		return { value, left: null, right: null, parent, height: 1 };
	}

	protected override emptyLike(): AvlTree<T> {
		return new AvlTree<T>(undefined, { comparator: this.comparator });
	}

	/**
	 * Walks from the changed node to the root, refreshing heights and rotating
	 * wherever the balance factor left ±1. O(log n).
	 */
	protected override rebalanceFrom(from: BinarySearchTreeNode<T> | null): void {
		let current = from as AvlTreeNode<T> | null;

		while (current !== null) {
			const parent = current.parent as AvlTreeNode<T> | null;

			this.refreshHeight(current);
			this.rotateIfUnbalanced(current);

			current = parent;
		}
	}

	private refreshHeight(node: AvlTreeNode<T>): void {
		node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
	}

	private balanceOf(node: AvlTreeNode<T>): number {
		return heightOf(node.left) - heightOf(node.right);
	}

	private rotateIfUnbalanced(node: AvlTreeNode<T>): void {
		const balance = this.balanceOf(node);

		if (balance > 1) {
			const left = node.left as AvlTreeNode<T>;

			// Left-right: straighten the zig-zag into a zig-zig first.
			if (this.balanceOf(left) < 0) {
				this.rotateLeft(left);
			}

			this.rotateRight(node);
			return;
		}

		if (balance < -1) {
			const right = node.right as AvlTreeNode<T>;

			if (this.balanceOf(right) > 0) {
				this.rotateRight(right);
			}

			this.rotateLeft(node);
		}
	}

	private rotateLeft(node: AvlTreeNode<T>): void {
		const pivot = node.right as AvlTreeNode<T>;

		this.replaceChild(node.parent, node, pivot);

		node.right = pivot.left;
		if (pivot.left !== null) {
			pivot.left.parent = node;
		}

		pivot.left = node;
		node.parent = pivot;

		this.refreshHeight(node);
		this.refreshHeight(pivot);
	}

	private rotateRight(node: AvlTreeNode<T>): void {
		const pivot = node.left as AvlTreeNode<T>;

		this.replaceChild(node.parent, node, pivot);

		node.left = pivot.right;
		if (pivot.right !== null) {
			pivot.right.parent = node;
		}

		pivot.right = node;
		node.parent = pivot;

		this.refreshHeight(node);
		this.refreshHeight(pivot);
	}
}
