/** Continue walking the graph, visiting children of this node. */
export const DfsWalkContinue = Symbol("DfsWalkContinue");
/** Skip visiting children of this node, but continue walking the graph. */
export const DfsWalkSkipChildren = Symbol("DfsWalkSkipChildren");
/** Stop walking the graph immediately, returning `true` from {@link dfs}. */
export const DfsWalkStop = Symbol("DfsWalkStop");

/** The return value of {@link DfsTraits.onEnter} to control the walk. */
export type DfsWalkControl =
	| typeof DfsWalkContinue
	| typeof DfsWalkSkipChildren
	| typeof DfsWalkStop;

export type DfsTraits<TNode> = {
	/** Returns the successors of a node, or `undefined`/empty for a leaf. */
	childrenOf: (node: TNode) => Iterable<TNode> | undefined;

	/**
	 * Called on entering a node, before its children. Returning `undefined` is
	 * treated as {@link DfsWalkContinue}.
	 */
	onEnter?: (node: TNode) => DfsWalkControl | undefined;

	/**
	 * Called on leaving a node, after its children — including when the walk is
	 * stopping, so a caller undoing state applied in `onEnter` always gets the
	 * matching call.
	 */
	onExit?: (node: TNode) => void;

	/**
	 * Marks nodes already visited, for a cyclic graph. Omit for a tree, where no
	 * node is reachable twice and the bookkeeping would be wasted.
	 */
	seen?: Set<TNode>;
};

/**
 * Walks a graph or tree of unknown shape depth-first, in pre-order.
 *
 * The structure is not required to conform to any shared node interface:
 * `childrenOf` is the only thing that has to know how a given `TNode` exposes
 * its successors, which lets one generic walker drive discriminated unions
 * whose node kinds carry children under entirely different field names.
 *
 * Time complexity: O(V + E). Without {@link DfsTraits.seen}, a cyclic graph does
 * not terminate — pass a `Set` whenever a cycle is possible.
 *
 * @param root - The node to start walking from.
 * @param traits - How to traverse, and what to do at each node.
 * @returns `true` if the walk was stopped early via {@link DfsWalkStop},
 *   `false` if it ran to completion.
 */
export function dfs<TNode>(root: TNode, traits: DfsTraits<TNode>): boolean {
	const { childrenOf, onEnter, onExit, seen } = traits;

	if (seen?.has(root) === true) {
		return false;
	}
	seen?.add(root);

	const control = onEnter?.(root) ?? DfsWalkContinue;

	if (control === DfsWalkStop) {
		onExit?.(root);
		return true;
	}

	let stopped = false;

	if (control !== DfsWalkSkipChildren) {
		const children = childrenOf(root);

		if (children !== undefined) {
			for (const child of children) {
				if (dfs(child, traits)) {
					stopped = true;
					break;
				}
			}
		}
	}

	onExit?.(root);

	return stopped;
}
