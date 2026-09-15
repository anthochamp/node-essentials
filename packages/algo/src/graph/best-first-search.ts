import type { DefinedValue } from "@ac-kit/core";

import {
	type GraphPath,
	type GraphSearchTraits,
	searchByPriority,
} from "./_search-by-priority.js";

/**
 * Finds a path from `start` to a goal, always expanding whichever frontier node
 * _looks_ closest to one — greedy best-first search.
 *
 * Ordering is by `heuristicOf` alone, ignoring the cost already paid. That
 * reaches a goal far sooner than {@link aStar} on a graph where the heuristic
 * points the right way, and returns a **worse than optimal** path when it does
 * not. Use {@link aStar} whenever the cheapest path is what matters; use this
 * when any path, found fast, is enough.
 *
 * The returned `cost` is still the true cost of the path walked, so a caller
 * can measure how far off it landed.
 *
 * Time complexity: O((V + E) log V), and `costOf` must be non-negative.
 *
 * @param start - The node to search from.
 * @param traits - How to expand, weight and test a node. `heuristicOf` is what
 *   drives this search; leaving it at its `0` default degenerates to an
 *   arbitrary-order traversal.
 * @returns The path found and its cost, or `null` if no goal is reachable.
 */
export function bestFirstSearch<TNode extends DefinedValue>(
	start: TNode,
	traits: GraphSearchTraits<TNode>,
): GraphPath<TNode> | null {
	return searchByPriority(start, traits, (_gScore, heuristic) => heuristic);
}
