import { DefinedValue } from "@ac-kit/core";

import { ISortedSet } from "../set/isorted-set.js";

/** A node in a binary tree. */
export interface IBinaryTreeNode<T> {
	value: T;
	left: IBinaryTreeNode<T> | null;
	right: IBinaryTreeNode<T> | null;
	parent: IBinaryTreeNode<T> | null;
}

/** A binary search tree: an {@link ISortedSet} that also exposes its root. */
export interface ISearchTree<
	T extends DefinedValue = DefinedValue,
> extends ISortedSet<T> {
	readonly root: IBinaryTreeNode<T> | null;
}
