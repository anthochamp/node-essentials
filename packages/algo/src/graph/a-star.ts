import type { DefinedValue } from "@ac-kit/core";

import {
	type GraphPath,
	type GraphSearchTraits,
	searchByPriority,
} from "./_search-by-priority.js";

/**
 * Finds the cheapest path from `start` to a goal, exploring by cost so far plus
 * estimated cost remaining.
 *
 * With no `heuristicOf` this **is** Dijkstra's algorithm — the estimate is
 * uniformly zero, so exploration is purely by cost so far. A heuristic that
 * never overestimates keeps the result optimal while cutting how much of the
 * graph gets visited; one that overestimates trades that guarantee for speed.
 *
 * Time complexity: O((V + E) log V), and `costOf` must be non-negative.
 *
 * @param start - The node to search from.
 * @param traits - How to expand, weight and test a node.
 * @returns The cheapest path and its cost, or `null` if no goal is reachable.
 */
export function aStar<TNode extends DefinedValue>(
	start: TNode,
	traits: GraphSearchTraits<TNode>,
): GraphPath<TNode> | null {
	return searchByPriority(
		start,
		traits,
		(gScore, heuristic) => gScore + heuristic,
	);
}
