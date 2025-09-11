import type { Promisable } from "type-fest";
import type { ICollection } from "./icollection.js";

/**
 * Interface representing the children of a tree node.
 */
export interface ITreeNodeChildren<
	T,
	N extends ITreeNode<T, N, C>,
	C extends ITreeNodeChildren<T, N, C>,
> extends ICollection<N> {}

/**
 * Interface representing a node in a tree data structure.
 *
 * A tree node contains a value and references to its child nodes.
 *
 * @template T The type of the value contained in the tree node.
 * @template N The type of the tree node itself, extending ITreeNode.
 * @template I The type of the iterable used for child nodes, which can be synchronous or asynchronous.
 */
export interface ITreeNode<
	T,
	N extends ITreeNode<T, N, C>,
	C extends ITreeNodeChildren<T, N, C>,
> {
	value(): Promisable<T | undefined>;
	setValue(value: T): Promisable<void>;

	readonly children: C;
}

/**
 * Interface representing a tree data structure.
 *
 * @template T The type of elements in the tree.
 */
export interface ITree<
	T,
	N extends ITreeNode<T, N, C>,
	C extends ITreeNodeChildren<T, N, C>,
> extends ITreeNode<T, N, C> {}
