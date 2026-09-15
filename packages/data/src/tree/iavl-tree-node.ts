import { IBinaryTreeNode } from "./isearch-tree.js";

/** A binary tree node augmented with the height an AVL tree needs to rebalance. */
export interface IAvlTreeNode<T> extends IBinaryTreeNode<T> {
	height: number;
}
