import type { Promisable } from "type-fest";
import type { ITree, ITreeNode, ITreeNodeChildren } from "./itree.js";

/**
 * Interface representing a node in a binary tree.
 *
 * A binary tree node contains a value and references to its left and right child nodes.
 *
 * @template T The type of the value stored in the node.
 * @template N The type of nodes in the binary tree, extending IBinaryTreeNode.
 */
export interface IBinaryTreeNode<
	T,
	N extends IBinaryTreeNode<T, N, C>,
	C extends ITreeNodeChildren<T, N, C>,
> extends ITreeNode<T, N, C> {
	left(): Promisable<N | null>;
	right(): Promisable<N | null>;

	setLeft(node: N | null): Promisable<void>;
	setRight(node: N | null): Promisable<void>;
}

/**
 * Interface representing a binary tree data type.
 *
 * A binary tree is a hierarchical data structure in which each node has at most
 * two children, referred to as the left child and the right child. The topmost
 * node is called the root, and nodes without children are called leaves.
 *
 * @template T The type of elements in the binary tree.
 * @template N The type of nodes in the binary tree, extending IBinaryTreeNode.
 */
export interface IBinaryTree<
	T,
	N extends IBinaryTreeNode<T, N, C>,
	C extends ITreeNodeChildren<T, N, C>,
> extends ITree<T, N, C> {}
